/* global Entry, EntryStatic */
"use strict";

const CHANNEL = "cs-class-entryjs";
const params = new URLSearchParams(location.search);
const programming = params.get("exercise") === "programming";
const traced = programming;
const mission = params.get("mission");
// Mission flags from the lesson page: arrow-key events keep the run waiting; vars shows A·B.
const keyMission = params.get("keys") === "1";
const showVariables = params.get("vars") === "1";
// The functions lesson turns on plain Entry functions (no parameters, return values or local variables).
const functionsEnabled = programming && params.get("fn") === "1";
// Dog-free lessons: every object is equal, a few starter objects stay, shapes can be viewed.
const free = programming && params.get("free") === "1";
// The robot lesson shows Entry's browser (Web Serial) connection for Hamster-S.
const robot = programming && params.get("robot") === "1";
const lockedIds = (params.get("locked") ?? "").split(",").filter(Boolean);
const maxObjects = free ? 12 : 6;
// The dog when there is one, otherwise the object being edited.
const mainObject = () => Entry.container.getObject("entrybot") ?? Entry.playground?.object ?? Entry.container.getAllObjects()[0];
const speechNow = () => {
  for (const object of free ? Entry.container.getAllObjects() : [Entry.container.getObject("entrybot")]) {
    const message = object?.entity.dialog?.message_?.replaceAll("\n", "");
    if (message) return message;
  }
  return "";
};
let disposed = false;
// Copy of FUNCTION_PALETTE in src/lib/classroom/entry-palette.ts, kept equal by tests/entry-palette.test.ts.
const FUNCTION_PALETTE = { category: "func", blocks: ["functionAddButton"] };
// Copy of ROBOT_PALETTE in src/lib/classroom/entry-palette.ts, kept equal by tests/entry-palette.test.ts.
const ROBOT_PALETTE = { category: "arduino", blocks: ["arduino_lite_reconnect", "hamsterlite_move_forward_for_secs", "hamsterlite_move_backward_for_secs", "hamsterlite_turn_for_secs", "hamsterlite_stop", "hamsterlite_set_led_to", "hamsterlite_clear_led", "hamsterlite_beep"] };
// Copy of ENTRY_PALETTE in src/lib/classroom/entry-palette.ts. This sandboxed
// script cannot import it; tests/entry-palette.test.ts keeps both lists equal.
const PROGRAMMING_PALETTE = [
  { category: "start", blocks: ["when_run_button_click", "when_some_key_pressed", "mouse_clicked", "mouse_click_cancled", "when_object_click", "when_object_click_canceled"] },
  { category: "flow", blocks: ["wait_second", "repeat_basic", "repeat_inf", "repeat_while_true", "stop_repeat", "continue_repeat", "_if", "if_else", "wait_until_true", "stop_object", "restart_project", "when_clone_start", "create_clone", "delete_clone", "remove_all_clones"] },
  { category: "moving", blocks: ["move_direction", "bounce_wall", "move_x", "move_y", "move_xy_time", "locate_x", "locate_y", "locate_xy", "locate_xy_time", "locate", "locate_object_time", "rotate_relative", "direction_relative", "rotate_by_time", "direction_relative_duration", "rotate_absolute", "direction_absolute", "see_angle_object", "move_to_angle"] },
  { category: "looks", blocks: ["show", "hide", "change_to_some_shape", "change_to_next_shape", "dialog_time", "dialog", "remove_dialog", "add_effect_amount", "change_effect_amount", "erase_all_effects", "change_scale_size", "set_scale_size", "stretch_scale_size", "reset_scale_size", "flip_x", "flip_y", "change_object_index"] },
  { category: "brush", blocks: ["brush_stamp", "start_drawing", "stop_drawing", "set_color", "change_thickness", "set_thickness", "start_fill", "stop_fill", "set_fill_color", "set_random_color", "change_brush_transparency", "set_brush_tranparency", "brush_erase_all"] },
  { category: "judgement", blocks: ["is_clicked", "is_object_clicked", "is_press_some_key", "reach_something", "is_type", "boolean_basic_operator", "boolean_and_or", "boolean_not"] },
  { category: "calc", blocks: ["calc_basic", "calc_rand", "coordinate_mouse", "coordinate_object", "quotient_and_mod", "calc_operation", "get_project_timer_value", "choose_project_timer_action", "set_visible_project_timer", "get_date", "distance_something", "length_of_string", "count_match_string", "combine_something", "char_at", "substring", "index_of_string", "replace_string", "reverse_of_string", "change_string_case"] },
  { category: "variable", blocks: ["ask_and_wait", "get_canvas_input_value", "set_visible_answer", "get_variable", "change_variable", "set_variable", "show_variable", "hide_variable"] },
];
// The lesson page that embeds this iframe. Production serves this file from the workspace host or the Entry CDN, so
// the page's origin comes from the referrer the page sends (the iframe sets referrerPolicy="origin"), or the browser's
// ancestor list when a referrer was stripped. Any site may frame this file, so wherever it runs it must hold nothing
// but what it is sent: the app's copy always runs in an opaque sandbox (next.config.ts sends a CSP sandbox), and the
// workspace host and the CDN serve nothing else. Messages go only to that origin and are accepted only from it.
const APP_ORIGIN = (() => {
  for (const candidate of [document.referrer, location.ancestorOrigins?.[0]]) {
    try { const url = new URL(candidate); if (url.protocol === "https:" || url.protocol === "http:") return url.origin; }
    catch { /* Missing or not a URL: try the next one. */ }
  }
  return location.origin;
})();
const send = (type, details = {}) => { if (!disposed) parent.postMessage({ channel: CHANNEL, type, ...details }, APP_ORIGIN); };
let loading = false;
let locked = false;
let original = null;
let monitor = null;
let startedAt = 0;
let lastSpeech = "";
let activeTime = 0;
let lastTick = 0;
// Event lines keep a run open after the start lines finish, so students can
// click or press keys. The finished result is reported once at that point.
const EVENT_STARTS = ["when_some_key_pressed", "mouse_clicked", "mouse_click_cancled", "when_object_click", "when_object_click_canceled"];
// Entry's stop erases brush lines and fills, so drawing runs wait the same way. Stamps survive a stop.
const DRAW_BLOCKS = ["start_drawing", "start_fill"];
const RUN_STARTS = ["when_run_button_click", "when_clone_start", ...EVENT_STARTS];
// A line draws when it, or a function it calls (each function once), has a pen block.
function drawsIn(blocks, seen = new Set()) {
  return blocks.some((block) => {
    if (DRAW_BLOCKS.includes(block.type)) return true;
    const id = /^func_(.+)$/.exec(block.type)?.[1];
    if (!id || seen.has(id)) return false;
    seen.add(id);
    const content = Entry.variableContainer?.functions_?.[id]?.content;
    return typeof content?.getBlockList === "function" && drawsIn(content.getBlockList(), seen);
  });
}
let waitsForEvents = false;
let keepsDrawing = false;
// A game that ends with ‘코드 멈추기’ keeps its last frame, because Entry's stop resets score, shapes and bubbles.
let keepsResult = false;
let reported = false;

function captureScripts() {
  for (const object of original.objects) {
    const live = Entry.container.getObject(object.id);
    if (live) object.script = live.getScriptText();
  }
  // Functions can be edited during a run too.
  if (functionsEnabled && typeof Entry.variableContainer?.getFunctionJSON === "function") original.functions = Entry.variableContainer.getFunctionJSON();
}

function exportProject() {
  // Entry.exportProject stops the engine. During a run, export only code into
  // the last stopped snapshot so runtime coordinates never replace the draft.
  if (Entry.engine.isState("stop")) original = Entry.exportProject();
  else if (original) captureScripts();
  if (!original) throw new Error("Project not loaded");
  return JSON.stringify(original);
}

const functionEditing = () => functionsEnabled && Entry.Func?.isEdit === true;
function changed() {
  // A function being edited is not the work yet; its save or cancel sends the result.
  if (loading || locked || !Entry.isLoadProject || functionEditing()) return;
  // Menu clones live offscreen until the drop is committed.
  if (Entry.getMainWS().board.dragBlock || Entry.playground.blockMenu.dragBlock) return;
  try { send("changed", { project: exportProject() }); }
  catch { send("error", { message: "작품의 저장 데이터를 읽지 못했어요." }); }
}

function result(reason) {
  const entity = mainObject()?.entity;
  if (!entity) return;
  const speech = speechNow();
  if (speech) lastSpeech = speech;
  send("result", { x: entity.getX(), y: entity.getY(), speech: lastSpeech, reason });
}

async function stop(reason) {
  if (monitor !== null) { clearInterval(monitor); monitor = null; if (!reported) result(reason); else send("waiting-ended", { reason }); }
  if (!Entry.engine.isState("stop")) await Entry.engine.toggleStop();
}

try {
  // PreloadJS adds X-Requested-With to files it thinks share this page's host, which forces a CORS preflight from the
  // opaque sandbox; the Entry CDN answers OPTIONS with 405. Every request from this sandbox is cross-origin anyway.
  if (typeof window.createjs?.RequestUtils?.isCrossDomain === "function") window.createjs.RequestUtils.isCrossDomain = () => true;
  // Entry's canvas controls omit CORS when loading their images. An opaque
  // sandbox needs anonymous requests so EaselJS can read pixels for hit tests.
  window.Image = new Proxy(window.Image, {
    construct(Image, args, newTarget) {
      const image = Reflect.construct(Image, args, newTarget);
      image.crossOrigin = "anonymous";
      return image;
    },
  });
  // EntryJS reads editor preferences from localStorage during initialization and saves its panel layout on unload.
  // An opaque sandbox has no site storage, and on the workspace host nothing may outlive one open (or reach another
  // lesson), so preferences always stay in memory.
  {
    const preferences = new Map();
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
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
  if (programming && keyMission && Entry.block?.when_some_key_pressed?.def) Entry.block.when_some_key_pressed.def.params = [null, "38"];
  if (functionsEnabled) {
    // The editor menu would offer parameter fields and the properties panel (value return, local variables).
    // A block shows unless every class in isNotFor is banned, so these get one class that stays banned.
    for (const type of ["function_field_string", "function_field_boolean", "showFunctionPropsButton", "function_name"]) if (Entry.block?.[type]) Entry.block[type].isNotFor = ["csClassHidden"];
  }
  if (robot) {
    // Entry hides a robot's blocks until it connects; students assemble first, and work without a robot still opens.
    for (const type of ROBOT_PALETTE.blocks.slice(1)) if (Entry.block?.[type]) Entry.block[type].isNotFor = [];
    if (Entry.block?.arduino_lite_reconnect?.params?.[0]) Entry.block.arduino_lite_reconnect.params[0].text = "햄스터S 연결하기";
  }
  EntryStatic.getAllBlocks = () => programming ? (robot ? [...PROGRAMMING_PALETTE, ROBOT_PALETTE] : functionsEnabled ? [...PROGRAMMING_PALETTE, FUNCTION_PALETTE] : PROGRAMMING_PALETTE) : [
    { category: "start", blocks: ["when_run_button_click"] },
    { category: "moving", blocks: ["move_direction"] },
    { category: "looks", blocks: ["dialog_time"] },
  ];
  Entry.creationChangedEvent = new Entry.Event(window);
  Entry.init(document.getElementById("workspace"), {
    // The production build may point the vendor <script> tags at the Entry CDN (scripts/entryjs-cdn.mjs). Elsewhere the
    // raw attribute stays "/entryjs/vendor". Entry copies libDir into picture URLs; the saved-project parsers accept
    // only their trusted local picture paths, so a CDN URL is never stored.
    type: "workspace", libDir: document.querySelector('script[src$="/entry/dist/entry.min.js"]').getAttribute("src").replace(/\/entry\/dist\/entry\.min\.js$/, ""), entryDir: "/entry",
    // The programming lesson lets students add objects from the lesson's own sprites.
    projectsaveable: false, objectEditable: programming, objectaddable: programming,
    objectdeletable: programming, pictureeditable: free, soundeditable: false,
    sceneEditable: false, variableEnable: programming, listEnable: false,
    functionEnable: functionsEnabled, messageEnable: false, hardwareEnable: robot,
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
        const first = !script.isInit;
        const result = ask.call(this, entity, script);
        if (first) {
          const field = Entry.stage.inputField;
          field._hiddenInput.setAttribute("aria-label", free ? "질문 대답" : programming && mission !== "name" ? "강아지 질문 대답" : "강아지 이름 대답");
          field._hiddenInput.maxLength = 180;
        }
        return result;
      };
    }
  }
  if (programming) {
    // Grading reads the dog's code, so the dog cannot be deleted. Loading clears all objects.
    const removeObject = Entry.container?.removeObject;
    if (typeof removeObject === "function") {
      Entry.container.removeObject = function (id, ...rest) {
        const target = typeof id === "string" ? id : id?.id;
        if (!loading && target === "entrybot") { send("main-object-locked"); return; }
        if (!loading && free && lockedIds.includes(target)) { send("object-locked", { name: String(Entry.container.getObject(target)?.name ?? "") }); return; }
        if (!loading && free && Entry.container.getAllObjects().length <= 1) { send("last-object"); return; }
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
        if (Entry.container.getAllObjects().length >= maxObjects) { send("clone-blocked", { reason: "limit" }); return undefined; }
        const clone = addCloneObject.call(this, source, ...rest);
        queueMicrotask(changed);
        return clone;
      };
    }
    // The lesson's own variables are rebuilt on save, so they cannot be deleted or renamed. Copy of
    // LESSON_VARIABLES and MAX_STUDENT_VARIABLES in src/lib/classroom/programming-entry.ts, plus brick-breaker's "score",
    // which the server keeps as a student variable and restores in parseProgrammingProject.
    const LESSON_VARIABLES = ["cs-A", "cs-B", "cs-clicks", "score"];
    const variables = Entry.variableContainer;
    const removeVariable = variables?.removeVariable, renameVariable = variables?.changeVariableName, addVariable = variables?._addVariable;
    if (typeof removeVariable === "function") variables.removeVariable = function (variable, ...rest) {
      if (!loading && LESSON_VARIABLES.includes(variable?.id_ ?? variable?.id)) { send("variable-locked"); return; }
      return removeVariable.call(this, variable, ...rest);
    };
    if (typeof renameVariable === "function") variables.changeVariableName = function (variable, name, ...rest) {
      if (!loading && LESSON_VARIABLES.includes(variable?.id_)) { if (variable.listElement?.nameField) variable.listElement.nameField.value = variable.name_; send("variable-locked"); return; }
      return renameVariable.call(this, variable, name, ...rest);
    };
    if (typeof addVariable === "function") variables._addVariable = function (...rest) {
      if (this.variables_.filter((item) => item.type === "variable" && !LESSON_VARIABLES.includes(item.id_)).length >= 10) { send("variable-limit"); return; }
      return addVariable.apply(this, rest);
    };
    // Deleting, renaming or changing a variable's value or visibility goes through Entry.do without a block
    // change event, so report it as an edit. Lesson variables always start at 0.
    const run = Entry.do;
    if (typeof run === "function") Entry.do = function (command, ...rest) {
      if (!loading && command === "variableSetDefaultValue" && LESSON_VARIABLES.includes(rest[0])) {
        if (variables.selected?.listElement) variables.updateSelectedVariable(variables.selected);
        send("variable-locked");
        return;
      }
      const result = run.call(this, command, ...rest);
      if (typeof command === "string" && command.startsWith("variable")) queueMicrotask(changed);
      return result;
    };
    // Entry's add button only asks for a sprite; the lesson page shows its own sprite list.
    Entry.addEventListener("openSpriteManager", () => { if (!locked && !loading) send("add-object-request"); });
    if (functionsEnabled) {
      Entry.getMainWS()?.getBlockMenu()?.banClass("csClassHidden", true);
      // Entry has no event for the function editor; the page learns when it opens and closes.
      for (const name of ["edit", "endEdit"]) {
        const original = Entry.Func?.[name];
        if (typeof original === "function") Entry.Func[name] = function (...rest) {
          const result = original.apply(this, rest);
          send("function-editing", { editing: Entry.Func.isEdit === true });
          if (name === "endEdit") queueMicrotask(changed);
          return result;
        };
      }
    }
    if (free) {
      // Shapes come from the bundled Entry library and are rebuilt on save, so they can only be viewed and picked.
      Entry.addEventListener("openPictureManager", () => send("picture-locked"));
      for (const name of ["clonePicture", "_removePicture"]) {
        if (typeof Entry.playground?.[name] === "function") Entry.playground[name] = () => send("picture-locked");
      }
      // ‘새로 그리기’ adds a blank 1×1 shape directly, skipping the picture manager; it is not in the trusted list, so the project would stop loading.
      if (typeof Entry.playground?.painter?.newPicture === "function") Entry.playground.painter.newPicture = () => send("picture-locked");
    }
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
  document.addEventListener("mousemove", resetActiveTime, true);
  document.addEventListener("touchstart", resetActiveTime, true);
  document.addEventListener("mouseup", () => queueMicrotask(changed));
  document.addEventListener("touchend", () => queueMicrotask(changed));
  // Frame input never bubbles to the lesson, and function editing deliberately sends no draft changes.
  let lastActivity = 0;
  const reportActivity = (event) => {
    const now = Date.now();
    if (!event.isTrusted || now - lastActivity < 1000 || loading || locked) return;
    lastActivity = now;
    send("activity");
  };
  for (const type of ["pointerdown", "keydown", "input", "scroll", "touchstart"]) document.addEventListener(type, reportActivity, { passive: true, capture: true });
  Entry.addEventListener("run", () => {
    if (locked || loading) { void stop("stopped"); return; }
    if (!traced) changed();
    if (traced) {
      // The run event fires during the engine transition. A full export here
      // calls toggleStop; capture the code without changing engine state.
      captureScripts();
      activeTime = 0; lastTick = Date.now();
    }
    lastSpeech = "";
    reported = false;
    waitsForEvents = Entry.container.getAllObjects().some((object) => object.script.getThreads().some((thread) => EVENT_STARTS.includes(thread.getFirstBlock()?.type)));
    // Only lines that run (a start or event block first) count; a loose pen block on the board does not.
    keepsDrawing = Entry.container.getAllObjects().some((object) => object.script.getThreads().some((thread) => RUN_STARTS.includes(thread.getFirstBlock()?.type) && typeof thread.getBlockList === "function" && drawsIn(thread.getBlockList())));
    keepsResult = Entry.container.getAllObjects().some((object) => object.script.getThreads().some((thread) => RUN_STARTS.includes(thread.getFirstBlock()?.type) && typeof thread.getBlockList === "function" && thread.getBlockList().some((block) => block.type === "stop_object")));
    startedAt = Date.now();
    send("running", { running: true });
    clearInterval(monitor);
    monitor = setInterval(() => {
      const speech = speechNow();
      if (speech) lastSpeech = speech;
      const idle = Entry.container.getAllObjects().every((item) => item.script.executors.length === 0);
      if (idle && !(programming && keyMission)) {
        if (!waitsForEvents && !keepsDrawing && !keepsResult) void stop("finished");
        else if (!reported) { result("finished"); reported = true; send("waiting", { drawing: !waitsForEvents, result: keepsResult }); }
      }
      if (monitor === null) return;
      if (traced) {
        const now = Date.now();
        const waitingIdle = idle && (reported || (programming && keyMission));
        // A flag set by the question block could outlive its line (`코드 멈추기` ends the line but leaves the
        // answer box open), so only a line that is still on a question pauses the limit.
        const asking = Entry.container.getAllObjects().some((item) => item.script.executors.some((executor) => executor.scope?.block?.type === "ask_and_wait"));
        if (!asking && !waitingIdle) activeTime += now - lastTick;
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
    if (disposed || event.source !== parent || event.origin !== APP_ORIGIN || event.data?.channel !== CHANNEL) return;
    const message = event.data;
    try {
      if (message.type === "load") {
        loading = true;
        document.getElementById("workspace").inert = true;
        await stop("stopped");
        if (disposed) return;
        Entry.clearProject();
        if (programming) for (const variable of message.project.variables ?? []) {
          if (["cs-A", "cs-B"].includes(variable.id)) variable.visible = showVariables;
        }
        Entry.loadProject(message.project);
        // Selecting the module shows the connect button; the browser's port chooser opens only from that click.
        if (robot && Entry.hwLite?.getStatus() !== "connected") Entry.do("objectAddHardwareLiteBlocks", Entry.HARDWARE_LITE_LIST["020E01"]);
        if (traced) Entry.playground.blockMenu.setMenu();
        // The workspace redraw schedules a second palette redraw. Drain both
        // before exposing the editor, since selectMenu closes active inputs.
        Entry.getMainWS().dReDraw.flush();
        Entry.playground.blockMenu.reDraw.flush();
        // Hardware mode parks palette blocks at x -99999 until a delayed align; one dragged sooner lands off the board, so wait before opening the editor.
        if (robot) {
          const palette = () => Entry.playground.blockMenu.code.getThreads().map((thread) => thread.getFirstBlock()).find((block) => block?.type === "when_run_button_click");
          for (let wait = 0; wait < 60 && palette()?.x < -9999; wait++) await new Promise((resolve) => setTimeout(resolve, 50));
          if (disposed) return;
        }
        // This Entry version aligns freshly created threads on load. Restore authored
        // anchors after that redraw; imported projects without anchors keep its layout.
        // Added objects come first in Entry's list; the dog is found by id and shown first.
        const shown = message.project.objects.find((object) => object.id === "entrybot") ?? message.project.objects[0];
        Entry.container.selectObject(shown.id);
        const script = shown.script;
        const threads = typeof script === "string" ? JSON.parse(script) : script;
        const board = Entry.getMainWS().board;
        board.code.getThreads().forEach((thread, index) => {
          const anchor = threads[index]?.[0], view = thread.getFirstBlock()?.view;
          if (view && Number.isFinite(anchor?.x) && Number.isFinite(anchor?.y)) view.moveTo(anchor.x, anchor.y, false);
        });
        board.scroller.resizeScrollBar();
        // loadProject returns before the stage image has finished loading.
        const stageObject = Entry.container.getObject(shown.id).entity.object;
        if (stageObject.image instanceof HTMLImageElement) await stageObject.image.decode();
        if (disposed) return;
        if (!stageObject.getTransformedBounds()) throw new Error("Stage picture is not ready");
        original = Entry.exportProject();
        loading = false;
        document.getElementById("workspace").inert = locked;
        send("loaded");
      } else if (message.type === "add-object" && programming && !locked && !loading && message.object && typeof message.object.id === "string") {
        await stop("stopped");
        // Backgrounds go behind every object.
        Entry.container.addObject(message.object, message.back === true ? Entry.container.getAllObjects().length : 0);
        // Keep the dog selected: its code is the graded code. Dog-free lessons select the new object.
        Entry.container.selectObject(free ? message.object.id : "entrybot");
        changed();
        send("object-added", { name: String(message.object.name ?? "") });
      } else if (message.type === "lock") {
        locked = message.locked === true;
        document.getElementById("workspace").inert = locked || loading;
      } else if (message.type === "stage-size") {
        // Phone-width pages show only this frame's left edge. Entry's smallest stage keeps its start button there.
        Entry.resizeElement({ ...Entry.interfaceState, canvasWidth: message.narrow === true ? Entry.CANVAS_DEFAULT_WIDTH : wideStage });
      } else if (message.type === "export" && functionEditing()) {
        send("exported", { id: message.id, refused: "function-editing" });
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
          const entity = Entry.container.getObject("entrybot")?.entity;
          if (entity) { entity.setX(0); entity.setY(0); }
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
