/* global Entry, EntryStatic */
"use strict";

const CHANNEL = "cs-class-entryjs";
const params = new URLSearchParams(location.search);
const programming = params.get("exercise") === "programming";
const traced = programming;
const mission = params.get("mission");
let disposed = false;
// Copy of ENTRY_PALETTE in src/lib/classroom/entry-palette.ts. This sandboxed
// script cannot import it; tests/entry-palette.test.ts keeps both lists equal.
const PROGRAMMING_PALETTE = [
  { category: "start", blocks: ["when_run_button_click", "when_some_key_pressed", "mouse_clicked", "mouse_click_cancled", "when_object_click", "when_object_click_canceled"] },
  { category: "flow", blocks: ["wait_second", "repeat_basic", "repeat_inf", "repeat_while_true", "stop_repeat", "continue_repeat", "_if", "if_else", "wait_until_true", "stop_object", "restart_project", "when_clone_start", "create_clone", "delete_clone", "remove_all_clones"] },
  { category: "moving", blocks: ["move_direction", "bounce_wall", "move_x", "move_y", "move_xy_time", "locate_x", "locate_y", "locate_xy", "locate_xy_time", "locate", "locate_object_time", "rotate_relative", "direction_relative", "rotate_by_time", "direction_relative_duration", "rotate_absolute", "direction_absolute", "see_angle_object", "move_to_angle"] },
  { category: "looks", blocks: ["show", "hide", "dialog_time", "dialog", "remove_dialog", "add_effect_amount", "change_effect_amount", "erase_all_effects", "change_scale_size", "set_scale_size", "stretch_scale_size", "reset_scale_size", "flip_x", "flip_y", "change_object_index"] },
  { category: "brush", blocks: ["brush_stamp", "start_drawing", "stop_drawing", "set_color", "change_thickness", "set_thickness", "start_fill", "stop_fill", "set_fill_color", "set_random_color", "change_brush_transparency", "set_brush_tranparency", "brush_erase_all"] },
  { category: "judgement", blocks: ["is_clicked", "is_object_clicked", "is_press_some_key", "reach_something", "is_type", "boolean_basic_operator", "boolean_and_or", "boolean_not"] },
  { category: "calc", blocks: ["calc_basic", "calc_rand", "coordinate_mouse", "coordinate_object", "quotient_and_mod", "calc_operation", "get_project_timer_value", "choose_project_timer_action", "set_visible_project_timer", "get_date", "distance_something", "length_of_string", "count_match_string", "combine_something", "char_at", "substring", "index_of_string", "replace_string", "reverse_of_string", "change_string_case"] },
  { category: "variable", blocks: ["ask_and_wait", "get_canvas_input_value", "set_visible_answer", "get_variable", "change_variable", "set_variable", "show_variable", "hide_variable"] },
];
const send = (type, details = {}) => { if (!disposed) parent.postMessage({ channel: CHANNEL, type, ...details }, location.origin); };
let loading = false;
let locked = false;
let original = null;
let monitor = null;
let startedAt = 0;
let lastSpeech = "";
let nameRun = null;
let awaitingAnswer = false;
let activeTime = 0;
let lastTick = 0;
// Event lines keep a run open after the start lines finish, so students can
// click or press keys. The finished result is reported once at that point.
const EVENT_STARTS = ["when_some_key_pressed", "mouse_clicked", "mouse_click_cancled", "when_object_click", "when_object_click_canceled"];
let waitsForEvents = false;
let reported = false;

function captureScripts() {
  for (const object of original.objects) {
    const live = Entry.container.getObject(object.id);
    if (live) object.script = live.getScriptText();
  }
}

function exportProject() {
  // Entry.exportProject stops the engine. During a run, export only code into
  // the last stopped snapshot so runtime coordinates never replace the draft.
  if (Entry.engine.isState("stop")) original = Entry.exportProject();
  else if (original) captureScripts();
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
  if (traced && nameRun) { send("name-run", { run: { ...nameRun, reason: nameRun.failed ? "error" : reason } }); nameRun = null; }
}

async function stop(reason) {
  if (monitor !== null) { clearInterval(monitor); monitor = null; if (!reported) result(reason); else send("waiting-ended", { reason }); }
  if (!Entry.engine.isState("stop")) await Entry.engine.toggleStop();
}

try {
  // Entry's canvas controls omit CORS when loading their images. An opaque
  // sandbox needs anonymous requests so EaselJS can read pixels for hit tests.
  window.Image = new Proxy(window.Image, {
    construct(Image, args, newTarget) {
      const image = Reflect.construct(Image, args, newTarget);
      image.crossOrigin = "anonymous";
      return image;
    },
  });
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
  // CanvasInput's keyup/cursor callbacks can redraw a field after it is hidden.
  const renderInput = window.CanvasInput?.prototype?.render;
  if (typeof renderInput === "function") {
    window.CanvasInput.prototype.render = function () {
      if (this._isHidden) return this;
      return renderInput.call(this);
    };
  }
  EntryStatic.fontFamily = "sans-serif";
  if (programming && mission === "keys" && Entry.block?.when_some_key_pressed?.def) Entry.block.when_some_key_pressed.def.params = [null, "38"];
  EntryStatic.getAllBlocks = () => programming ? PROGRAMMING_PALETTE : [
    { category: "start", blocks: ["when_run_button_click"] },
    { category: "moving", blocks: ["move_direction"] },
    { category: "looks", blocks: ["dialog_time"] },
  ];
  Entry.creationChangedEvent = new Entry.Event(window);
  Entry.init(document.getElementById("workspace"), {
    type: "workspace", libDir: "/entryjs/vendor", entryDir: "/entry",
    // The programming lesson lets students add objects from the lesson's own sprites.
    projectsaveable: false, objectEditable: programming, objectaddable: programming,
    objectdeletable: programming, pictureeditable: false, soundeditable: false,
    sceneEditable: false, variableEnable: false, listEnable: false,
    functionEnable: false, messageEnable: false, hardwareEnable: false,
    aiLearningEnable: false, aiUtilizeDisable: true, expansionDisable: true,
    textCodingEnable: false, backpackDisable: true, exportObjectEnable: false,
    blockSaveImageEnable: false, iframeDomAccess: "none", fullScreenEnable: false,
    commentDisable: true,
  });
  const wideStage = Entry.interfaceState.canvasWidth;
  if (traced) {
    const ask = Entry.block?.ask_and_wait?.func;
    if (typeof ask === "function") {
      Entry.block.ask_and_wait.func = function (entity, script) {
        try {
          const first = !script.isInit;
          const input = Entry.container.inputValue;
          const answered = script.isInit && input.complete && input.sprite === entity && Entry.stage.inputField?._isHidden;
          // Only the dog's question and speech belong to the name mission's run record.
          const own = entity.parent?.id === "entrybot";
          if (!script.isInit && nameRun && own) { awaitingAnswer = true; nameRun.steps.push({ kind: "ask", value: String(script.getValue("VALUE", script)) }); }
          if (answered && nameRun && own) { awaitingAnswer = false; nameRun.steps.push({ kind: "answer", value: String(Entry.container.getInputValue()) }); }
          const result = ask.call(this, entity, script);
          if (first) {
            const field = Entry.stage.inputField;
            field._hiddenInput.setAttribute("aria-label", programming && mission !== "name" ? "강아지 질문 대답" : "강아지 이름 대답");
            field._hiddenInput.maxLength = 180;
          }
          return result;
        } catch (error) { if (nameRun) nameRun.failed = true; throw error; }
      };
    }
    const say = Entry.block?.dialog_time?.func;
    if (typeof say === "function") {
      Entry.block.dialog_time.func = function (entity, script) {
        try {
          const first = !script.isStart;
          const result = say.call(this, entity, script);
          if (first && nameRun && entity.parent?.id === "entrybot") nameRun.steps.push({ kind: "say", value: String(entity.dialog?.message_ ?? "") });
          return result;
        } catch (error) { if (nameRun) nameRun.failed = true; throw error; }
      };
    }
  }
  if (programming) {
    // Grading reads the dog's code, so the dog cannot be deleted. Loading clears all objects.
    const removeObject = Entry.container?.removeObject;
    if (typeof removeObject === "function") {
      Entry.container.removeObject = function (id, ...rest) {
        if (!loading && (typeof id === "string" ? id : id?.id) === "entrybot") { send("main-object-locked"); return; }
        const removed = removeObject.call(this, id, ...rest);
        queueMicrotask(changed);
        return removed;
      };
    }
    // Duplicate and paste skip the sprite list. The dog stays unique and the object limit holds.
    const addCloneObject = Entry.container?.addCloneObject;
    if (typeof addCloneObject === "function") {
      Entry.container.addCloneObject = function (source, ...rest) {
        if (source?.id === "entrybot") { send("clone-blocked", { reason: "main" }); return undefined; }
        if (Entry.container.getAllObjects().length >= 6) { send("clone-blocked", { reason: "limit" }); return undefined; }
        const clone = addCloneObject.call(this, source, ...rest);
        queueMicrotask(changed);
        return clone;
      };
    }
    // Entry's add button only asks for a sprite; the lesson page shows its own sprite list.
    Entry.addEventListener("openSpriteManager", () => { if (!locked && !loading) send("add-object-request"); });
  }
  Entry.creationChangedEvent.attach(window, () => queueMicrotask(changed));
  document.addEventListener("input", (event) => {
    // Native fields listen to keyup. Paste/IME input also needs to reach the model.
    if (!(event.target instanceof HTMLInputElement) || !(event.target.classList.contains("entry-widget-input-field") || (traced && event.target.classList.contains("entryCanvasHiddenInput")))) return;
    event.target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    queueMicrotask(changed);
  });
  if (traced) document.addEventListener("input", () => send("editing"));
  if (traced) document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.isComposing && event.target instanceof HTMLInputElement && event.target.classList.contains("entryCanvasHiddenInput")) event.stopImmediatePropagation();
  }, true);
  const resetActiveTime = () => { if (traced && monitor !== null) { activeTime = 0; lastTick = Date.now(); } };
  document.addEventListener("keydown", resetActiveTime, true);
  document.addEventListener("mousedown", resetActiveTime, true);
  document.addEventListener("touchstart", resetActiveTime, true);
  document.addEventListener("mouseup", () => queueMicrotask(changed));
  document.addEventListener("touchend", () => queueMicrotask(changed));
  Entry.addEventListener("run", () => {
    if (locked || loading) { void stop("stopped"); return; }
    if (!traced) changed();
    if (traced) {
      // The run event fires during the engine transition. A full export here
      // calls toggleStop; capture the code without changing engine state.
      captureScripts();
      nameRun = { id: crypto.randomUUID(), project: JSON.stringify(original), steps: [] };
      awaitingAnswer = false; activeTime = 0; lastTick = Date.now();
      send("name-start", { id: nameRun.id, project: nameRun.project });
    }
    lastSpeech = "";
    reported = false;
    waitsForEvents = Entry.container.getAllObjects().some((object) => object.script.getThreads().some((thread) => EVENT_STARTS.includes(thread.getFirstBlock()?.type)));
    startedAt = Date.now();
    send("running", { running: true });
    clearInterval(monitor);
    monitor = setInterval(() => {
      const object = Entry.container.getObject("entrybot");
      const speech = object?.entity.dialog?.message_?.replaceAll("\n", "");
      if (speech) lastSpeech = speech;
      const idle = Entry.container.getAllObjects().every((item) => item.script.executors.length === 0);
      if (idle && !(programming && mission === "keys")) {
        if (!waitsForEvents) void stop("finished");
        else if (!reported) { result("finished"); reported = true; send("waiting"); }
      }
      if (monitor === null) return;
      if (traced) {
        const now = Date.now();
        const waitingIdle = idle && (reported || (programming && mission === "keys"));
        if (!awaitingAnswer && !waitingIdle) activeTime += now - lastTick;
        lastTick = now;
      }
      if ((traced ? activeTime : Date.now() - startedAt) >= 15000) void stop("timeout");
    }, 100);
  });
  Entry.addEventListener("beforeStop", () => {
    if (monitor !== null) { clearInterval(monitor); monitor = null; if (!reported) result("stopped"); else send("waiting-ended", { reason: "stopped" }); }
  });
  Entry.addEventListener("stop", () => { send("running", { running: false }); });
  window.addEventListener("message", async (event) => {
    if (disposed || event.source !== parent || event.origin !== location.origin || event.data?.channel !== CHANNEL) return;
    const message = event.data;
    try {
      if (message.type === "load") {
        loading = true;
        document.getElementById("workspace").inert = true;
        await stop("stopped");
        if (disposed) return;
        Entry.clearProject();
        if (programming) for (const variable of message.project.variables ?? []) {
          if (["cs-A", "cs-B"].includes(variable.id)) variable.visible = ["multiply", "average"].includes(mission);
        }
        Entry.loadProject(message.project);
        if (traced) Entry.playground.blockMenu.setMenu();
        // The workspace redraw schedules a second palette redraw. Drain both
        // before exposing the editor, since selectMenu closes active inputs.
        Entry.getMainWS().dReDraw.flush();
        Entry.playground.blockMenu.reDraw.flush();
        // This Entry version aligns freshly created threads on load. Restore authored
        // anchors after that redraw; imported projects without anchors keep its layout.
        // Added objects come first in Entry's list; the dog is found by id and shown first.
        Entry.container.selectObject("entrybot");
        const script = (message.project.objects.find((object) => object.id === "entrybot") ?? message.project.objects[0]).script;
        const threads = typeof script === "string" ? JSON.parse(script) : script;
        const board = Entry.getMainWS().board;
        board.code.getThreads().forEach((thread, index) => {
          const anchor = threads[index]?.[0], view = thread.getFirstBlock()?.view;
          if (view && Number.isFinite(anchor?.x) && Number.isFinite(anchor?.y)) view.moveTo(anchor.x, anchor.y, false);
        });
        board.scroller.resizeScrollBar();
        // loadProject returns before the stage image has finished loading.
        const stageObject = Entry.container.getObject("entrybot").entity.object;
        if (stageObject.image instanceof HTMLImageElement) await stageObject.image.decode();
        if (disposed) return;
        if (!stageObject.getTransformedBounds()) throw new Error("Stage picture is not ready");
        original = Entry.exportProject();
        loading = false;
        document.getElementById("workspace").inert = locked;
        send("loaded");
      } else if (message.type === "add-object" && programming && !locked && !loading && message.object && typeof message.object.id === "string") {
        await stop("stopped");
        Entry.container.addObject(message.object, 0);
        // Keep the dog selected: its code is the graded code.
        Entry.container.selectObject("entrybot");
        changed();
        send("object-added", { name: String(message.object.name ?? "") });
      } else if (message.type === "lock") {
        locked = message.locked === true;
        document.getElementById("workspace").inert = locked || loading;
      } else if (message.type === "stage-size") {
        // Phone-width pages show only this frame's left edge. Entry's smallest stage keeps its start button there.
        Entry.resizeElement({ ...Entry.interfaceState, canvasWidth: message.narrow === true ? Entry.CANVAS_DEFAULT_WIDTH : wideStage });
      } else if (message.type === "export") {
        document.activeElement?.blur();
        Entry.getMainWS().syncCode();
        send("exported", { id: message.id, project: exportProject() });
      } else if (message.type === "run" && !locked && Entry.engine.isState("stop")) {
        changed();
        Entry.engine.toggleRun();
      } else if (message.type === "key" && programming && !locked && Entry.engine.isState("run") && ["37", "38", "39", "40"].includes(message.key)) {
        resetActiveTime();
        Entry.container.mapEntityIncludeCloneOnScene(Entry.engine.raiseKeyEvent, ["keyPress", Number(message.key)]);
      } else if (message.type === "stop" || message.type === "reset-stage") {
        await stop("stopped");
        if (message.type === "reset-stage") {
          const entity = Entry.container.getObject("entrybot").entity;
          entity.setX(0); entity.setY(0);
          send("result", { x: 0, y: 0, speech: "", reason: "reset" });
        }
      }
    } catch (error) {
      // Image decode can reject during iframe removal, before pagehide runs.
      // Report in the next task so teardown can finish before checking lifetime.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (disposed || window.closed) return;
      console.error("EntryJS workspace operation failed:", error.message); loading = false; send("error", { message: "작업실에서 작품을 읽지 못했어요. 저장된 작품을 유지하고 있어요." });
    }
  });
  // Resetting the preview can remove this frame while its stage image decodes.
  window.addEventListener("pagehide", (event) => { disposed = !event.persisted; clearInterval(monitor); Entry.stop(); });
  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!event.repeat && !event.isComposing && event.keyCode !== 229 && !loading && !locked) send("save-request");
    }
    if (event.key === "Escape") send("focus-return");
  }, true);
  send("ready");
} catch (error) {
  console.error("EntryJS initialization failed:", error.message);
  document.getElementById("load-error").hidden = false;
  send("error", { message: "작업실을 불러오지 못했어요." });
}
