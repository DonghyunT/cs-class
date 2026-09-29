/* global Entry, EntryStatic */
"use strict";

const CHANNEL = "cs-class-entryjs";
const send = (type, details = {}) => parent.postMessage({ channel: CHANNEL, type, ...details }, location.origin);
let loading = false;
let locked = false;
let original = null;
let monitor = null;
let startedAt = 0;
let lastSpeech = "";

function exportProject() {
  // Entry.exportProject stops the engine. During a run, export only code into
  // the last stopped snapshot so runtime coordinates never replace the draft.
  if (Entry.engine.isState("stop")) original = Entry.exportProject();
  else if (original) original.objects[0].script = Entry.container.getObject("entrybot").getScriptText();
  if (!original) throw new Error("Project not loaded");
  return JSON.stringify(original);
}

function changed() {
  if (loading || locked || !Entry.isLoadProject) return;
  // Menu clones live offscreen until the drop is committed.
  if (Entry.getMainWS().board.dragBlock || Entry.playground.blockMenu.dragBlock) return;
  try { send("changed", { project: exportProject() }); }
  catch { send("error", { message: "작품의 저장 데이터를 읽지 못했어요." }); }
}

function result(reason) {
  const entity = Entry.container.getObject("entrybot")?.entity;
  if (!entity) return;
  const speech = entity.dialog?.message_?.replaceAll("\n", "") ?? "";
  if (speech) lastSpeech = speech;
  send("result", { x: entity.getX(), y: entity.getY(), speech: lastSpeech, reason });
}

async function stop(reason) {
  if (monitor !== null) { clearInterval(monitor); monitor = null; result(reason); }
  if (!Entry.engine.isState("stop")) await Entry.engine.toggleStop();
}

try {
  // EntryJS reads editor preferences from localStorage during initialization.
  // An opaque sandbox cannot access site storage, so preferences stay in memory.
  try { window.localStorage.getItem("entryjs"); }
  catch {
    const preferences = new Map();
    Object.defineProperty(window, "localStorage", { value: {
      getItem: (key) => preferences.get(String(key)) ?? null,
      setItem: (key, value) => { preferences.set(String(key), String(value)); },
      removeItem: (key) => { preferences.delete(String(key)); },
      clear: () => { preferences.clear(); },
      key: (index) => Array.from(preferences.keys())[index] ?? null,
      get length() { return preferences.size; },
    } });
  }
  EntryStatic.fontFamily = "sans-serif";
  EntryStatic.getAllBlocks = () => [
    { category: "start", blocks: ["when_run_button_click"] },
    { category: "moving", blocks: ["move_direction"] },
    { category: "looks", blocks: ["dialog_time"] },
  ];
  Entry.creationChangedEvent = new Entry.Event(window);
  Entry.init(document.getElementById("workspace"), {
    type: "workspace", libDir: "/entryjs/vendor", entryDir: "/entry",
    projectsaveable: false, objectEditable: false, objectaddable: false,
    objectdeletable: false, pictureeditable: false, soundeditable: false,
    sceneEditable: false, variableEnable: false, listEnable: false,
    functionEnable: false, messageEnable: false, hardwareEnable: false,
    aiLearningEnable: false, aiUtilizeDisable: true, expansionDisable: true,
    textCodingEnable: false, backpackDisable: true, exportObjectEnable: false,
    blockSaveImageEnable: false, iframeDomAccess: "none", fullScreenEnable: false,
    commentDisable: true,
  });
  Entry.creationChangedEvent.attach(window, () => queueMicrotask(changed));
  document.addEventListener("input", (event) => {
    // Native fields listen to keyup. Paste/IME input also needs to reach the model.
    if (!(event.target instanceof HTMLInputElement) || !event.target.classList.contains("entry-widget-input-field")) return;
    event.target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    queueMicrotask(changed);
  });
  document.addEventListener("mouseup", () => queueMicrotask(changed));
  document.addEventListener("touchend", () => queueMicrotask(changed));
  Entry.addEventListener("run", () => {
    if (locked) { void stop("stopped"); return; }
    changed();
    lastSpeech = "";
    startedAt = Date.now();
    send("running", { running: true });
    clearInterval(monitor);
    monitor = setInterval(() => {
      const object = Entry.container.getObject("entrybot");
      const speech = object?.entity.dialog?.message_?.replaceAll("\n", "");
      if (speech) lastSpeech = speech;
      if (object && object.script.executors.length === 0) void stop("finished");
      else if (Date.now() - startedAt >= 15000) void stop("timeout");
    }, 100);
  });
  Entry.addEventListener("beforeStop", () => {
    if (monitor !== null) { clearInterval(monitor); monitor = null; result("stopped"); }
  });
  Entry.addEventListener("stop", () => { send("running", { running: false }); });
  window.addEventListener("message", async (event) => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== CHANNEL) return;
    const message = event.data;
    try {
      if (message.type === "load") {
        loading = true;
        await stop("stopped");
        Entry.clearProject();
        Entry.loadProject(message.project);
        // The workspace redraw schedules a second palette redraw. Drain both
        // before exposing the editor, since selectMenu closes active inputs.
        Entry.getMainWS().dReDraw.flush();
        Entry.playground.blockMenu.reDraw.flush();
        original = Entry.exportProject();
        loading = false;
        send("loaded");
      } else if (message.type === "lock") {
        locked = message.locked === true;
        document.getElementById("workspace").inert = locked;
      } else if (message.type === "export") {
        document.activeElement?.blur();
        Entry.getMainWS().syncCode();
        send("exported", { id: message.id, project: exportProject() });
      } else if (message.type === "run" && !locked && Entry.engine.isState("stop")) {
        changed();
        Entry.engine.toggleRun();
      } else if (message.type === "stop" || message.type === "reset-stage") {
        await stop("stopped");
        if (message.type === "reset-stage") {
          const entity = Entry.container.getObject("entrybot").entity;
          entity.setX(0); entity.setY(0);
          send("result", { x: 0, y: 0, speech: "", reason: "reset" });
        }
      }
    } catch { loading = false; send("error", { message: "작업실에서 작품을 읽지 못했어요. 저장된 작품을 유지하고 있어요." }); }
  });
  window.addEventListener("pagehide", () => { clearInterval(monitor); Entry.stop(); });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") send("focus-return");
  });
  send("ready");
} catch (error) {
  console.error("EntryJS initialization failed:", error.message);
  document.getElementById("load-error").hidden = false;
  send("error", { message: "작업실을 불러오지 못했어요." });
}
