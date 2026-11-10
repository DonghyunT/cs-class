import { HARMLESS_BLOCKS, spritePictures, THINKING_MESSAGE, TRUSTED_SPRITES } from "../classroom/entry-palette";
import { COUNTER, KEY_LABELS, entryNumeric, functionCallId, missionBlockIssue, missionById, parseProgrammingProject, pictureId, type EntryNode } from "../classroom/programming-entry";

// Server-side grading. Kept out of the client bundle so fixed test inputs are not shipped to students.
class MissionError extends Error {}
// Thrown by ‘반복 중단하기’ and caught by the nearest loop.
class StopRepeat extends Error {}
// Thrown by ‘코드 멈추기’ and caught where the line was started.
class StopObject extends Error {}

// One run may evaluate at most this many blocks, keep this long a text and say this many lines.
const MAX_STEPS = 20_000, MAX_TEXT = 500, MAX_SPEECH = 50, MAX_REPEAT = 1000, MAX_SEGMENTS = 200, MAX_CALL_DEPTH = 20;
// One function call: the function it ran, the call it was made from, and the loops running when it was made.
type CallRecord = { fn: string; parent: number | null; loops: number[] };
// Event missions watch each forever loop for this many passes after every click.
const FRAMES = 4;
// Speech keeps only letters and digits, so spaces, punctuation and emoji never matter.
const letters = (text: string) => text.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
// Each result's key word. A word that holds another (‘불합격’ ⊃ ‘합격’) is removed before the
// shorter one is looked for. A line with no word is a greeting; one with two is unclear (null).
const wordsIn = (line: string, words: readonly string[]) => words.filter((word) => words.reduce((rest, other) => other !== word && other.includes(word) ? rest.split(other).join("") : rest, letters(line)).includes(word));
const outcomeOf = (line: string, words: readonly string[]) => { const found = wordsIn(line, words); return found.length > 1 ? null : found[0] ?? ""; };
// Each decision mission's result words.
const RESULT_WORDS: Record<string, readonly string[]> = { pass: ["합격", "불합격"], freethrow: ["훌륭", "잘했", "연습"], ride: ["있어", "없어"] };
// A decision whose branches are right but whose lines mix in another result's word. It quotes the
// goal's whole phrases, not the matching stems (‘잘했’).
const RESULT_PHRASES: Record<string, readonly string[]> = { pass: ["합격", "불합격"], freethrow: ["훌륭해요", "잘했어요", "더 연습해 보자"], ride: ["탈 수 있어요", "탈 수 없어요"] };
export const wordingMessage = (id: string) => `조건은 맞게 나눴어요. 결과를 말할 때 ${RESULT_PHRASES[id].map((w) => `‘${w}’`).join("·")} 중 맞는 말 하나만 넣어 주세요.`;

// Deterministic interpreter for the lessons' bounded blocks, following EntryJS 4.0.23 semantics.
// It never runs submitted JavaScript or accepts a client's claimed result.
export function checkProgrammingMission(id: string, raw: unknown): { passed: boolean; message: string } {
  const p = parseProgrammingProject(raw), mission = missionById(id);
  const fail = (message: string) => ({ passed: false, message });
  if (!p || !mission) return fail("작품을 읽지 못했어요. 입력한 블록은 유지하고 다시 확인해 주세요.");
  const issue = missionBlockIssue(id, raw);
  if (issue) return fail(issue);
  // An object running code: its shapes (by index) and what it said.
  type Actor = { id: string; count: number; index: number; said: string[]; visible?: boolean };
  // A failed check is run once more with ‘생각하기’ counted as speech, to say why it failed,
  // and a failed decision once more with only the wording relaxed (`wordingOnly`).
  let thinkSpeaks = false, wordingOnly = false;
  // `observe` stops forever loops after a few passes and keeps them to rerun after events.
  function machine(inputs: string[], observe = false) {
    type Value = { value: string | number | boolean; input: boolean; computed?: number };
    // Variables students made start at their saved value, as in Entry.
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false }, [COUNTER.id]: { value: 0, input: false }, ...Object.fromEntries(p!.variables.map((v) => [v.id, { value: v.value, input: false }])) };
    // The first answer stored in each variable, so a result saved over A later still counts.
    const firstInput: Record<string, Value> = {};
    let actor: Actor | null = null;
    const forevers: { body: EntryNode[]; actor: Actor | null }[] = [];
    let answer = "", asks = 0, x = 0, y = 0, direction = 90, mouseX = 0, mouseY = 0, bouncedWall = false, stopped: string | null = null;
    let touching = new Set<string>();
    let steps = 0, speeches = 0, usedLogic = false, rotation = 0, drawing = false, loopDepth = 0, asksInLoop = 0;
    // True from a loop's second pass on: a stroke drawn then is drawn by repetition.
    let again = false;
    // Every line said, with whether it came from an answer, the calculation it shows and how many questions came before.
    const sayings: { text: string; input: boolean; computed?: number; asks: number }[] = [];
    // Pen strokes, whether each was drawn inside a loop that drew on two or more passes and whether on a repeated pass.
    let segments: Stroke[] = [];
    // Every function call (its function, the call it was made from, the loops running then), the call now
    // running, how many passes each loop made, and the shape changes with the call that made them.
    const bodies = new Map(p!.functions.map((f) => [f.id, f.body]));
    const calls: CallRecord[] = [], loopStack: number[] = [], loopPasses: number[] = [], shapes: { call: number | null }[] = [];
    let current: number | null = null, callDepth = 0;
    // Entry keeps 방향 at 0 unless the object rotates freely (회전 방식), so ‘방향 회전’ then moves nothing.
    let rotationLocked = false;
    // The strokes drawn inside each running loop, marked `repeated` when that loop ends having drawn on two or more passes.
    const open: Stroke[][] = [];
    const step = () => { if (++steps > MAX_STEPS) throw new MissionError("실행이 너무 길어요. 반복이나 조건을 다시 확인해 주세요."); };
    const number = (v: unknown) => { if (String(v).trim() === "" || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e6) throw new MissionError("실행할 숫자 입력을 확인해 주세요."); return Number(v); };
    // EntryJS compares a non-empty numeric string as a number.
    const comparable = (v: string | number | boolean) => typeof v === "string" && v.length && !Number.isNaN(Number(v)) ? Number(v) : v;
    // A block whose variable was deleted shows ‘대상 없음’ in Entry.
    const variable = (id: unknown) => { if (!Object.hasOwn(variables, String(id))) throw new MissionError("변수 블록에 ‘대상 없음’이 있어요. ▾를 눌러 변수를 다시 골라 주세요."); return variables[String(id)]; };
    // A student variable can hold a copy of A·B, so it counts too; the runs decide whether the logic is right.
    const stored = ["cs-A", "cs-B", ...p!.variables.map((v) => v.id)];
    const usesAB = (n: unknown): boolean => !!n && typeof n === "object" && ((n as EntryNode).type === "get_variable" && stored.includes(String((n as EntryNode).params[0])) || (n as EntryNode).params.some(usesAB));
    function evaluate(n: EntryNode): Value {
      step();
      if (["text", "number", "angle"].includes(n.type)) return { value: n.params[0] as string | number, input: false };
      if (n.type === "True" || n.type === "False") return { value: n.type === "True", input: false };
      if (n.type === "get_canvas_input_value") return { value: answer, input: asks > 0 };
      if (n.type === "get_variable") return variable(n.params[0]);
      if (n.type === "get_pictures") return { value: String(n.params[0] ?? ""), input: false };
      // No mouse button is held between the simulated clicks.
      if (n.type === "is_clicked") return { value: false, input: false };
      if (n.type === "coordinate_mouse") return { value: n.params[1] === "y" ? mouseY : mouseX, input: false };
      // shortcut: reads the object that is running, the only target these missions use; add other targets if a mission needs them.
      if (n.type === "coordinate_object") { const field = n.params[3]; return { value: field === "x" ? x : field === "y" ? y : field === "direction" ? direction : rotation, input: false }; }
      // The same input must always grade the same, so a random value is the middle of its range.
      if (n.type === "calc_rand") return { value: (number(evaluate(n.params[1] as EntryNode).value) + number(evaluate(n.params[3] as EntryNode).value)) / 2, input: false };
      if (n.type === "reach_something") {
        const target = String(n.params[1] ?? "");
        const hit = (actor ? touching.has(`${actor.id}:${target}`) : false) || touching.has(target) || ((target === "wall" || target === "edge") && ["wall_up", "wall_down", "wall_right", "wall_left"].some((w) => touching.has(w)));
        return { value: actor?.visible !== false && hit, input: false };
      }
      // Any logic block that looks at A·B counts; the inputs decide whether it is right.
      if ((n.type === "boolean_not" || n.type === "boolean_and_or") && usesAB(n)) usedLogic = true;
      if (n.type === "boolean_not") return { value: !evaluate(n.params[1] as EntryNode).value, input: false };
      if (n.type === "quotient_and_mod") {
        const a = number(evaluate(n.params[1] as EntryNode).value), b = number(evaluate(n.params[3] as EntryNode).value);
        if (b === 0) throw new MissionError("0으로 나눌 수 없어요.");
        return { value: n.params[5] === "QUOTIENT" ? Math.floor(a / b) : a - b * Math.floor(a / b), input: false };
      }
      const left = evaluate(n.params[n.type === "combine_something" ? 1 : 0] as EntryNode), right = evaluate(n.params[n.type === "combine_something" ? 3 : 2] as EntryNode);
      // ‘+’ joins as text when a side is text that is not a number, like Entry (‘평균은 ’ + 5).
      // An empty side stays a number error (the legacy fixture pins it).
      if (n.type === "combine_something" || n.type === "calc_basic" && n.params[1] === "PLUS" && [left.value, right.value].some((v) => typeof v === "string" && v !== "" && !entryNumeric(v))) {
        const text = String(left.value) + String(right.value);
        if (text.length > MAX_TEXT) throw new MissionError("글자가 너무 길어요.");
        return { value: text, input: left.input || right.input, computed: left.computed === undefined ? right.computed : right.computed === undefined ? left.computed : undefined };
      }
      if (n.type === "boolean_and_or") return { value: n.params[1] === "OR" ? Boolean(left.value) || Boolean(right.value) : Boolean(left.value) && Boolean(right.value), input: false };
      if (n.type === "boolean_basic_operator") {
        const a = comparable(left.value), b = comparable(right.value);
        const result = ({ EQUAL: a === b, NOT_EQUAL: a != b, GREATER: a > b, LESS: a < b, GREATER_OR_EQUAL: a >= b, LESS_OR_EQUAL: a <= b } as Record<string, boolean>)[String(n.params[1])];
        if (result === undefined) throw new MissionError("비교 기호를 확인해 주세요.");
        return { value: result, input: false };
      }
      const a = number(left.value), b = number(right.value);
      const result = n.params[1] === "PLUS" ? a + b : n.params[1] === "MINUS" ? a - b : n.params[1] === "MULTI" ? a * b : a / b;
      return { value: number(result), input: left.input || right.input, computed: left.input || right.input ? result : undefined };
    }
    // ‘말하기’ and ‘( )초 동안 말하기’ treat the speak/think choice the same way.
    const say = (value: Value, mode: unknown) => {
      if (mode === "think" && !thinkSpeaks) return;
      if (++speeches > MAX_SPEECH) throw new MissionError("말하기가 너무 많아요.");
      const text = String(value.value);
      sayings.push({ text, input: value.input, computed: value.computed, asks }); actor?.said.push(text);
    };
    // EntryJS moves along direction + rotation and draws while the pen is down.
    const goTo = (nextX: number, nextY: number) => {
      if (drawing && (Math.abs(nextX - x) > 1e-9 || Math.abs(nextY - y) > 1e-9)) {
        if (segments.length >= MAX_SEGMENTS) throw new MissionError("선을 너무 많이 그렸어요.");
        const stroke: Stroke = { from: [x, y], to: [nextX, nextY], repeated: false, again, call: current };
        segments.push(stroke); for (const list of open) list.push(stroke);
      }
      x = nextX; y = nextY;
    };
    function loop(body: EntryNode[], next: () => boolean, forever = false) {
      if (forever && observe) { forevers.push({ body, actor }); let left = FRAMES; next = () => left-- > 0; }
      loopDepth++;
      // `drew` counts the passes that drew: a loop drawing on one pass only is not repetition.
      const outer = again, drawn: Stroke[] = [], loopId = loopPasses.push(0) - 1; let passes = 0, drew = 0;
      open.push(drawn); loopStack.push(loopId);
      try { while (next()) { step(); again = outer || passes++ > 0; const before = drawn.length; try { exec(body); } catch (error) { if (error instanceof StopRepeat) break; throw error; } finally { if (drawn.length > before) drew++; } } }
      finally { loopDepth--; again = outer; open.pop(); loopStack.pop(); loopPasses[loopId] = passes; if (drew > 1) for (const s of drawn) s.repeated = true; }
    }
    function exec(list: EntryNode[]) {
      for (const n of list) {
        step();
        const callee = functionCallId(n.type), body = callee ? bodies.get(callee) : undefined;
        if (body) {
          if (callDepth >= MAX_CALL_DEPTH) throw new MissionError("함수가 자기 자신을 계속 부르고 있어요. 함수 안에서 같은 함수를 다시 부르지 않았는지 확인해 주세요.");
          const caller = current;
          current = calls.push({ fn: callee!, parent: caller, loops: [...loopStack] }) - 1; callDepth++;
          try { exec(body); } finally { current = caller; callDepth--; }
          continue;
        }
        if (n.type === "ask_and_wait") {
          // The safe's tries end with 1234, so asking again inside a loop means it never stops.
          if (asks >= inputs.length) throw new MissionError(id === "safe" && loopDepth ? "1234를 맞힌 뒤에도 또 물어요. 맞히면 반복이 멈추도록 ‘반복 중단하기’나 반복 조건을 확인해 주세요." : "이번 목표에 필요한 질문을 차례로 연결해 주세요.");
          answer = inputs[asks++]; if (loopDepth) asksInLoop++;
        }
        else if (n.type === "set_variable") {
          const value = evaluate(n.params[1] as EntryNode), id = String(n.params[0]);
          variable(id); variables[id] = value;
          if (value.input && value.computed === undefined && !firstInput[id]) firstInput[id] = value;
        }
        else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw new MissionError("말하기 시간은 0~10초로 정해 주세요."); say(value, n.params[2]); }
        else if (n.type === "dialog") say(evaluate(n.params[0] as EntryNode), n.params[1]);
        else if (n.type === "_if") { if (evaluate(n.params[0] as EntryNode).value) exec(n.statements?.[0] ?? []); }
        else if (n.type === "if_else") exec(n.statements?.[evaluate(n.params[0] as EntryNode).value ? 0 : 1] ?? []);
        else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value), angle = (direction + rotation) * Math.PI / 180; goTo(x + Math.sin(angle) * distance, y + Math.cos(angle) * distance); }
        else if (n.type === "direction_relative") direction += number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "rotate_relative") { const turn = number(evaluate(n.params[0] as EntryNode).value); if (!rotationLocked) rotation += turn; }
        else if (n.type === "rotate_absolute") { const to = number(evaluate(n.params[0] as EntryNode).value); if (!rotationLocked) rotation = to; }
        else if (n.type === "locate_xy") goTo(number(evaluate(n.params[0] as EntryNode).value), number(evaluate(n.params[1] as EntryNode).value));
        else if (n.type === "locate_x") goTo(number(evaluate(n.params[0] as EntryNode).value), y);
        else if (n.type === "bounce_wall") {
          bouncedWall = true;
          if (touching.has("wall_up") || touching.has("wall_down")) direction = 180 - direction;
          if (touching.has("wall_left") || touching.has("wall_right") || touching.has("wall") || touching.has("edge")) direction = -direction;
        }
        else if (n.type === "move_x") goTo(x + number(evaluate(n.params[0] as EntryNode).value), y);
        else if (n.type === "move_y") goTo(x, y + number(evaluate(n.params[0] as EntryNode).value));
        // Timed moves and turns end where Entry's frames end; the seconds do not change the result.
        else if (n.type === "move_xy_time") goTo(x + number(evaluate(n.params[1] as EntryNode).value), y + number(evaluate(n.params[2] as EntryNode).value));
        else if (n.type === "locate_xy_time") goTo(number(evaluate(n.params[1] as EntryNode).value), number(evaluate(n.params[2] as EntryNode).value));
        else if (n.type === "rotate_by_time") { const turn = number(evaluate(n.params[1] as EntryNode).value); if (!rotationLocked) rotation += turn; }
        else if (n.type === "direction_relative_duration") direction += number(evaluate(n.params[1] as EntryNode).value);
        // ‘( ) 방향으로 ( )만큼 움직이기’ ignores the object's direction.
        else if (n.type === "move_to_angle") { const angle = number(evaluate(n.params[0] as EntryNode).value) * Math.PI / 180, distance = number(evaluate(n.params[1] as EntryNode).value); goTo(x + Math.sin(angle) * distance, y + Math.cos(angle) * distance); }
        else if (n.type === "start_drawing" || n.type === "stop_drawing") drawing = n.type === "start_drawing";
        else if (n.type === "brush_erase_all") segments = [];
        else if (n.type === "hide" || n.type === "show") { if (actor) actor.visible = n.type === "show"; }
        else if (HARMLESS_BLOCKS.has(n.type)) continue;
        else if (n.type === "repeat_basic") {
          const count = number(evaluate(n.params[0] as EntryNode).value);
          if (count < 0) throw new MissionError("반복 횟수는 0보다 작을 수 없어요.");
          if (count > MAX_REPEAT) throw new MissionError(`반복 횟수는 ${MAX_REPEAT}번까지만 확인해요.`);
          let left = Math.floor(count);
          loop(n.statements?.[0] ?? [], () => left-- > 0);
        }
        // ‘될 때까지’ repeats while the condition is false; ‘인 동안’ while it is true.
        else if (n.type === "repeat_while_true") loop(n.statements?.[0] ?? [], () => !!evaluate(n.params[0] as EntryNode).value !== (n.params[1] !== "while"));
        // Only the step budget ends a loop without ‘반복 중단하기’.
        else if (n.type === "repeat_inf") loop(n.statements?.[0] ?? [], () => true, true);
        else if (n.type === "change_variable") {
          if (!n.params[0]) throw new MissionError("더할 변수를 골라 주세요.");
          const target = variable(n.params[0]);
          variables[String(n.params[0])] = { value: number(number(target.value) + number(evaluate(n.params[1] as EntryNode).value)), input: false };
        }
        else if (n.type === "change_to_next_shape" || n.type === "change_to_some_shape") {
          if (!actor || actor.count < 2) throw new MissionError("모양이 여러 개인 오브젝트에서 모양을 바꿔 주세요.");
          shapes.push({ call: current });
          if (n.type === "change_to_next_shape") actor.index = (actor.index + (n.params[0] === "prev" ? actor.count - 1 : 1)) % actor.count;
          else {
            const picked = String(evaluate(n.params[0] as EntryNode).value), owner = actor;
            const index = Array.from({ length: owner.count }, (_, i) => pictureId(owner.id, i)).indexOf(picked);
            if (index < 0) throw new MissionError("이 오브젝트의 모양을 골라 주세요.");
            actor.index = index;
          }
        }
        // Following the mouse does not change what is graded.
        else if (n.type === "locate") continue;
        else if (n.type === "stop_repeat") { if (!loopDepth) throw new MissionError("‘반복 중단하기’는 반복 블록 안에 넣어 주세요."); throw new StopRepeat(); }
        // shortcut: ‘이 코드’ ends its own line and every other target ends the whole simulated run; model each target before a mission accepts more than ‘모든 코드’.
        else if (n.type === "stop_object") { const target = String(n.params[0] ?? "all"); if (target !== "thisThread") stopped = target; throw new StopObject(); }
        else throw new MissionError("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
      }
    }
    const result = () => ({ variables, firstInput, asks, x, y, direction, rotation, usedLogic, segments, asksInLoop, sayings, calls, loopPasses, shapes, stopped, bouncedWall });
    return {
      result, variables,
      run(list: EntryNode[], who: Actor | null) { actor = who; try { exec(list); } catch (error) { if (!(error instanceof StopObject)) throw error; } },
      // Start from an object's saved 이동 방향, 방향 and 회전 방식 instead of Entry's defaults.
      orient(moving: number, turned: number, method: string) { rotationLocked = method !== "free"; direction = moving; rotation = rotationLocked ? 0 : turned; },
      // One more watch of every forever loop, as frames passing on the stage.
      frames(passes = FRAMES) { for (const item of [...forevers]) { if (stopped) break; actor = item.actor; let left = passes; try { loop(item.body, () => left-- > 0); } catch (error) { if (!(error instanceof StopObject)) throw error; if (!stopped) forevers.splice(forevers.indexOf(item), 1); } } },
      place(px: number, py: number) { x = px; y = py; },
      sense(mx: number, my: number, hits: readonly string[] = []) { mouseX = mx; mouseY = my; touching = new Set(hits); bouncedWall = false; },
    };
  }
  function run(signal: string, inputs: string[], m = machine(inputs), who: Actor | null = null) {
    // A dog-free project runs the start line of whichever object owns it (missionBlockIssue keeps it to one object).
    const lines = (p!.free ? p!.added.flatMap((o) => o.threads) : p!.threads).filter((t) => signal === "click" ? t[0]?.type === "when_run_button_click" : t[0]?.type === "when_some_key_pressed" && t[0].params[1] === signal);
    // Named as the palette shows the block (‘위쪽 화살표 키를 눌렀을 때’); only arrow keys are graded.
    const block = signal === "click" ? "‘시작하기 버튼을 클릭했을 때’" : `‘${KEY_LABELS[signal]} 화살표 키를 눌렀을 때’`;
    if (lines.length > 1) throw new MissionError(`${block} 줄이 여러 개예요. ${signal === "click" ? "" : "키마다 "}한 줄로 이어 붙여 주세요.`);
    if (!lines.length) throw new MissionError(`${block} 아래에 블록을 연결해 주세요.`);
    m.run(lines[0].slice(1), who);
    return m.result();
  }
  const actorOf = (id: string, sprite: string, index = 0): Actor => ({ id, count: spritePictures(TRUSTED_SPRITES.find((item) => item.id === sprite)!).length, index, said: [] });
  // The tree must grow one shape at a time with clicks, never on its own, and speak when grown.
  function growTree() {
    const tree = p!.added.find((o) => o.sprite === "tree-growth");
    if (!tree) throw new MissionError("나무 오브젝트가 없어요. 선생님께 알려 주세요.");
    const cast = [...(p!.free ? [] : [{ actor: { id: "entrybot", count: 1, index: 0, said: [] } as Actor, threads: p!.threads }]), ...p!.added.map((o) => ({ actor: actorOf(o.id, o.sprite, o.picture), threads: o.threads }))];
    const grown = cast.find((c) => c.actor.id === tree.id)!.actor, last = grown.count - 1;
    const m = machine([], true);
    const fire = (event: string, only?: Actor) => { for (const c of cast) if (!only || c.actor === only) for (const t of c.threads) if (t[0]?.type === event) m.run(t.slice(1), c.actor); };
    fire("when_run_button_click"); m.frames();
    if (grown.index !== 0) return false;
    let stage = 0;
    for (let click = 1; click <= 30; click++) {
      const before = grown.said.length;
      fire("mouse_clicked"); fire("when_object_click", grown); m.frames();
      const now: number = grown.index; m.frames();
      if (grown.index !== now || Number(m.variables[COUNTER.id].value) !== click) return false;
      if (now !== stage && now !== stage + 1) return false;
      if (now < last && grown.said.length) return false;
      if (now === last && stage < last && grown.said.length === before) return false;
      stage = now;
    }
    return stage === last;
  }
  type Stroke = { from: [number, number]; to: [number, number]; repeated: boolean; again: boolean; call: number | null };
  const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;
  const heading = (s: Stroke) => Math.atan2(s.to[0] - s.from[0], s.to[1] - s.from[1]) * 180 / Math.PI;
  // Strokes as the stage shows them: a side drawn in pieces is one side (repeated only if every
  // piece was), and a line drawn again over an earlier one adds nothing. With `laps`, lines are
  // drawn over only in whole laps, so a fixed repeat count cannot stand in for the answer.
  const visible = (strokes: Stroke[], laps?: number) => {
    const sides = strokes.reduce<Stroke[]>((list, s) => {
      const last = list.at(-1);
      if (last && near(last.to, s.from) && Math.abs(((heading(s) - heading(last)) % 360 + 540) % 360 - 180) < 0.01) list[list.length - 1] = { from: last.from, to: s.to, repeated: last.repeated && s.repeated, again: last.again || s.again, call: last.call };
      else list.push(s);
      return list;
    }, []);
    if (laps && sides.length % laps) return sides;
    // A line drawn over only outside a loop still counts as drawn outside one.
    return sides.reduce<Stroke[]>((kept, s) => {
      const same = kept.find((t) => near(t.from, s.from) && near(t.to, s.to) || near(t.from, s.to) && near(t.to, s.from));
      if (same) same.repeated &&= s.repeated; else kept.push({ ...s });
      return kept;
    }, []);
  };
  // A closed regular polygon with `sides` equal strokes: every side drawn inside a loop that drew
  // on two or more passes, and some side on a repeated pass (so ‘1번 반복’ around most sides fails).
  const regular = (strokes: Stroke[], sides: number, length?: number) => strokes.length === sides && strokes.every((s) => s.repeated) && strokes.some((s) => s.again) && closedRegular(strokes, sides, length);
  // The shape alone: `sides` equal strokes closing with equal turns of 360 ÷ sides.
  const closedRegular = (strokes: Stroke[], sides: number, length?: number) => {
    if (strokes.length !== sides) return false;
    const lengths = strokes.map((s) => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]));
    const headings = strokes.map(heading);
    const turns = headings.map((h, i) => ((headings[(i + 1) % sides] - h) % 360 + 540) % 360 - 180);
    return lengths.every((l) => l > 1 && Math.abs(l - lengths[0]) < 0.01 && (length === undefined || Math.abs(l - length) < 0.01))
      && strokes.every((s, i) => near(s.to, strokes[(i + 1) % sides].from))
      && turns.every((t) => Math.abs(t - turns[0]) < 0.5 && Math.abs(Math.abs(t) - 360 / sides) < 0.5);
  };
  type Run = ReturnType<typeof run>;
  // Function missions judge what each call drew, counting the calls it made in turn.
  const within = (r: Run, call: number | null, root: number) => { for (let c = call; c !== null; c = r.calls[c].parent) if (c === root) return true; return false; };
  const shapeCalls = (r: Run, sides: number) => r.calls.flatMap((c, id) => {
    const strokes = visible(r.segments.filter((s) => within(r, s.call, id)));
    return closedRegular(strokes, sides, 50) ? [{ id, fn: c.fn, strokes }] : [];
  });
  const insideFunctions = (r: Run) => { if (r.segments.some((s) => s.call === null)) throw new MissionError("선이 함수 밖에서 그려졌어요. 그리는 블록을 함수 안으로 옮겨 보세요."); return r; };
  const byFunction = <T extends { fn: string }>(list: T[]) => [...Map.groupBy(list, (item) => item.fn).values()];
  // Two strokes touch when they cross or come within half a step of each other.
  const pointGap = (point: [number, number], s: Stroke) => {
    const [x1, y1] = s.from, dx = s.to[0] - x1, dy = s.to[1] - y1, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point[0] - x1) * dx + (point[1] - y1) * dy) / length)) : 0;
    return Math.hypot(point[0] - x1 - t * dx, point[1] - y1 - t * dy);
  };
  const side = (o: [number, number], a: [number, number], b: [number, number]) => Math.sign((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]));
  const crosses = (s: Stroke, t: Stroke) => side(t.from, t.to, s.from) * side(t.from, t.to, s.to) < 0 && side(s.from, s.to, t.from) * side(s.from, s.to, t.to) < 0;
  const apart = (a: Stroke[], b: Stroke[]) => a.every((s) => b.every((t) => !crosses(s, t) && Math.min(pointGap(s.from, t), pointGap(s.to, t), pointGap(t.from, s), pointGap(t.to, s)) > 0.5));
  // ←·→ each move 10 and change the costume once, inside calls of one function both keys share.
  function catWalk() {
    const owner = p!.added.find((o) => o.threads.some((t) => t[0]?.type === "when_some_key_pressed" && ["37", "38", "39", "40"].includes(String(t[0].params[1]))));
    if (!owner) return false;
    const moves: Record<string, number> = { 39: 10, 37: -10 }, chains: string[][] = [];
    for (const order of [["39", "37", "39", "39", "37"], ["37", "37", "39", "37", "39"]]) {
      const m = machine([]), who = actorOf(owner.id, owner.sprite, owner.picture);
      m.orient(owner.entity.direction, owner.entity.rotation, owner.rotateMethod);
      for (const key of order) {
        const { x, y, shapes } = m.result(), changes = shapes.length, r = run(key, [], m, who);
        if (Math.abs(r.x - x - moves[key]) > 0.0001 || Math.abs(r.y - y) > 0.0001 || r.shapes.length !== changes + 1) return false;
        const change = r.shapes[changes].call;
        if (change === null) throw new MissionError("‘다음 모양으로 바꾸기’를 ‘고양이 걸음’ 함수 안으로 옮겨 보세요.");
        const fns: string[] = [];
        for (let c: number | null = change; c !== null; c = r.calls[c].parent) fns.push(r.calls[c].fn);
        chains.push(fns);
      }
    }
    if (!chains.reduce((shared, fns) => shared.filter((fn) => fns.includes(fn)), chains[0]).length) throw new MissionError("두 키 모두 같은 ‘고양이 걸음’ 함수를 부르게 해 주세요.");
    return true;
  }
  // A drawing mission's start line, run from its owner's saved heading (touching shapes depend on it).
  const drawing = () => {
    const m = machine([]), owner = p!.added.find((o) => o.threads.some((t) => t[0]?.type === "when_run_button_click"));
    if (owner) m.orient(owner.entity.direction, owner.entity.rotation, owner.rotateMethod);
    return insideFunctions(run("click", [], m));
  };
  // Two calls of one function each draw a side-50 square, and the squares do not touch.
  function windows() {
    const groups = byFunction(shapeCalls(drawing(), 4));
    if (groups.some((list) => list.some((a, i) => list.slice(i + 1).some((b) => apart(a.strokes, b.strokes))))) return true;
    if (groups.some((list) => list.length > 1)) throw new MissionError("두 창문이 붙어 있어요. 더 멀리 옮긴 뒤 불러 보세요.");
    if (groups.length) throw new MissionError("창문 함수를 한 번만 불렀어요. 위치를 옮긴 뒤 한 번 더 불러 보세요.");
    return false;
  }
  // Calls of three different functions draw the square, the pentagon and the hexagon.
  function fixShapes() {
    const r = drawing();
    const [four, five, six] = [4, 5, 6].map((sides) => new Set(shapeCalls(r, sides).map((s) => s.fn)));
    return [...four].some((a) => [...five].some((b) => b !== a && [...six].some((c) => c !== a && c !== b)));
  }
  // Six calls of one function, made inside a loop that ran twice or more, draw squares turned 60° apart.
  function flower() {
    const r = drawing();
    const repeated = (id: number) => r.calls[id].loops.some((loop) => r.loopPasses[loop] >= 2);
    return byFunction(shapeCalls(r, 4).filter((s) => repeated(s.id))).some((list) => {
      const turns = [...new Set(list.map((s) => Math.round((((heading(s.strokes[0]) % 360) + 360) % 360) * 2) / 2))].sort((a, b) => a - b);
      return turns.length === 6 && turns.every((t, i) => Math.abs((i ? t - turns[i - 1] : t + 360 - turns[5]) - 60) < 0.5);
    });
  }
  // Lines said after the last question; greetings and lines said before the answers are in
  // (‘합격 기준은 60점이야’) are never results.
  const after = (r: Run) => r.sayings.filter((s) => s.asks === r.asks).map((s) => s.text);
  // In every case some line says a result, and every line that does says the expected one.
  const saysOnly = (runs: Run[], expected: string[]) => {
    if (wordingOnly) return branchesRight(runs, expected);
    return runs.every((r, i) => { const results = after(r).map((t) => outcomeOf(t, RESULT_WORDS[id])).filter((o) => o !== ""); return results.length > 0 && results.every((o) => o === expected[i]); });
  };
  // `wordingOnly`: are the branches right and only the words wrong? Digits are ignored, so an echoed
  // answer is the same line in every case; lines every case says are dropped. A result line left must
  // come only in cases expecting one result (three separate ‘만일’ say ‘잘했어요’ for 9 and for 7), and
  // each case's first result line must hold its expected word.
  const branchesRight = (runs: Run[], expected: string[]) => {
    const said = runs.map((r) => after(r).map((t) => t.replace(/\d/g, "")));
    const kept = said.map((lines) => lines.filter((t) => !said.every((o) => o.includes(t))));
    if (kept.flat().some((t) => wordsIn(t, RESULT_WORDS[id]).length && new Set(expected.filter((_, i) => kept[i].includes(t))).size > 1)) return false;
    return kept.every((lines, i) => !!lines.map((t) => wordsIn(t, RESULT_WORDS[id])).find((f) => f.length)?.includes(expected[i]));
  };
  // A and B must first store the two inputs, in either order: asking for B first is also correct.
  const storedInputs = (r: Run, a: number, b: number) => {
    const stored = [Number(r.firstInput["cs-A"]?.value), Number(r.firstInput["cs-B"]?.value)];
    return !!r.firstInput["cs-A"] && !!r.firstInput["cs-B"] && (stored[0] === a && stored[1] === b || stored[0] === b && stored[1] === a);
  };
  // Every case asks once and says only the expected result.
  const decides = (cases: [number, string][]) => { const runs = cases.map(([input]) => run("click", [String(input)])); return runs.every((r) => r.asks === 1) && saysOnly(runs, cases.map((c) => c[1])); };
  const normAngle = (deg: number) => ((deg % 360) + 360) % 360;
  const angleDiff = (a: number, b: number) => { const d = Math.abs(normAngle(a) - normAngle(b)); return Math.min(d, 360 - d); };
  function gradePaddle() {
    const pad = p!.added.find((o) => o.id === "paddle" || o.sprite === "paddle");
    if (!pad) return false;
    const starts = pad.threads.filter((t) => t[0]?.type === "when_run_button_click");
    if (!starts.length) return false;
    const m = machine([], true), who = actorOf(pad.id, pad.sprite, pad.picture);
    m.orient(pad.entity.direction, pad.entity.rotation, pad.rotateMethod);
    m.place(pad.entity.x, pad.entity.y);
    m.sense(-180, 40);
    for (const t of starts) m.run(t.slice(1), who);
    if (Math.abs(m.result().x - -180) > 0.0001 || Math.abs(m.result().y - pad.entity.y) > 0.0001) return false;
    for (const mx of [-75, 0, 65, 190]) {
      m.sense(mx, -30);
      m.frames();
      if (Math.abs(m.result().x - mx) > 0.0001 || Math.abs(m.result().y - pad.entity.y) > 0.0001) return false;
    }
    return true;
  }
  function gradeBall(checkBricks = false) {
    const ballObj = p!.added.find((o) => o.id === "ball" || o.sprite === "ball");
    if (!ballObj) return false;
    const starts = ballObj.threads.filter((t) => t[0]?.type === "when_run_button_click" || t[0]?.type === "when_object_click");
    if (!starts.length) return false;
    const m = machine([], true), who = actorOf(ballObj.id, ballObj.sprite, ballObj.picture);
    m.orient(ballObj.entity.direction, ballObj.entity.rotation, ballObj.rotateMethod);
    m.place(ballObj.entity.x, ballObj.entity.y);
    m.sense(0, 0, []);
    for (const t of starts) m.run(t.slice(1), who);
    const r0 = m.result(), startHeading = ballObj.entity.direction + (ballObj.rotateMethod === "free" ? ballObj.entity.rotation : 0);
    if (Math.hypot(r0.x - ballObj.entity.x, r0.y - ballObj.entity.y) < 1 || !r0.bouncedWall || r0.stopped !== null || angleDiff(r0.direction + r0.rotation, startHeading) > 0.01) return false;
    m.sense(0, 0, []);
    m.frames(1);
    const r1 = m.result();
    if (Math.hypot(r1.x - r0.x, r1.y - r0.y) < 0.5 || !r1.bouncedWall || r1.stopped !== null || angleDiff(r1.direction + r1.rotation, startHeading) > 0.01) return false;
    const targets = ["paddle", ...(checkBricks ? ["brick1", "brick2", "brick3"] : [])];
    for (const target of targets) {
      const before = m.result().direction + m.result().rotation;
      m.sense(0, 0, [target, `${ballObj.id}:${target}`]);
      m.frames(1);
      let after = m.result();
      if (angleDiff(after.direction + after.rotation, before) < 1) {
        m.orient(before + 90, 0, ballObj.rotateMethod);
        m.sense(0, 0, [target, `${ballObj.id}:${target}`]);
        m.frames(1);
        after = m.result();
        if (angleDiff(after.direction + after.rotation, before + 90) < 1) return false;
      }
      if (after.stopped !== null) return false;
    }
    for (const wall of ["wall_up", "wall_left", "wall_right"]) { m.sense(0, 0, [wall]); m.frames(1); if (m.result().stopped !== null) return false; }
    m.sense(0, 0, ["wall_down", `${ballObj.id}:wall_down`]);
    m.frames(1);
    return m.result().stopped === "all";
  }
  function gradeBrick() {
    const brickIds = ["brick1", "brick2", "brick3"] as const;
    if (!brickIds.every((bid) => p!.added.some((o) => o.id === bid))) return false;
    const scoreId = p!.variables.find((v) => v.id === "score" || v.name === "점수")?.id ?? "score";
    const runOrder = (order: readonly string[]) => {
      const cast = p!.added.map((o) => ({ actor: { ...actorOf(o.id, o.sprite, o.picture), visible: o.entity.visible }, obj: o }));
      const shown = () => cast.find((c) => c.actor.id === "youwin")?.actor.visible === true;
      const m = machine([], true);
      if (!Object.hasOwn(m.variables, scoreId)) return { ok: false, won: false };
      m.sense(0, 0, []);
      for (const c of cast) {
        m.orient(c.obj.entity.direction, c.obj.entity.rotation, c.obj.rotateMethod);
        m.place(c.obj.entity.x, c.obj.entity.y);
        for (const t of c.obj.threads) if (t[0]?.type === "when_run_button_click") m.run(t.slice(1), c.actor);
      }
      m.frames(1);
      if (Number(m.variables[scoreId].value) !== 0 || shown() || m.result().stopped !== null) return { ok: false, won: false };
      if (brickIds.some((bid) => cast.find((c) => c.actor.id === bid)!.actor.visible === false)) return { ok: false, won: false };
      for (let i = 0; i < order.length; i++) {
        const targetBrick = order[i];
        m.sense(0, 0, [`${targetBrick}:ball`, `ball:${targetBrick}`]);
        m.frames();
        const scoreNow = Number(m.variables[scoreId].value);
        const brickActor = cast.find((c) => c.actor.id === targetBrick)!.actor;
        if (scoreNow !== i + 1 || brickActor.visible !== false) return { ok: false, won: false };
        if (i < order.length - 1 && (shown() || m.result().stopped !== null)) return { ok: false, won: false };
      }
      m.sense(0, 0, []);
      m.frames(1);
      const won = shown() && m.result().stopped === "all";
      return { ok: true, won };
    };
    const a = runOrder(["brick1", "brick2", "brick3"]);
    const b = runOrder(["brick2", "brick3", "brick1"]);
    return a.ok && b.ok && a.won && b.won;
  }
  // The server cannot see a robot move, so robot missions check the blocks and their order; the teacher checks the robot.
  function robotLine(types: readonly string[], check: (found: EntryNode[]) => boolean = () => true) {
    return p!.added.flatMap((o) => o.threads).filter((t) => t[0]?.type === "when_run_button_click").some((line) => {
      let from = 0;
      const found = types.map((type) => { const at = line.findIndex((n, i) => i >= from && n.type === type); from = at + 1; return at < 0 ? null : line[at]; });
      return found.every(Boolean) && check(found as EntryNode[]);
    });
  }
  const seconds = (n: EntryNode) => { const value = (n.params[0] as EntryNode | null)?.params?.[0]; return entryNumeric(value) ? Number(value) : NaN; };
  function grade(): boolean {
    if (id === "robot-go") return robotLine(["hamsterlite_move_forward_for_secs", "hamsterlite_move_backward_for_secs"], ([ahead, back]) => seconds(ahead) > 0 && seconds(ahead) === seconds(back));
    // Zero seconds does not move and Entry drives backward on a negative number, so ‘앞으로’ needs a positive time.
    if (id === "robot-signal") return robotLine(["hamsterlite_set_led_to", "hamsterlite_move_forward_for_secs", "hamsterlite_beep", "hamsterlite_clear_led"], ([, ahead]) => seconds(ahead) > 0);
    if (id === "name") return ["초코", "보리"].every((value) => { const r = run("click", [value]); return r.asks === 1 && r.sayings.some((s) => s.input && s.text.includes(value)); });
    // The change challenge subtracts the price from the money paid and says it with ‘원’ in one line.
    if (id === "multiply" || id === "average" || id === "change") return (id === "change" ? [[5000, 3200], [10000, 7500], [1000, 1000], [3000, 450]] : [[6, 4], [3, 7], [-2, 5], [0, 9]]).every(([a, b]) => {
      const r = run("click", [String(a), String(b)]), expected = id === "multiply" ? a * b : id === "average" ? (a + b) / 2 : a - b;
      // The last line that shows a calculation from the inputs is the answer; a closing line may follow.
      const shown = r.sayings.filter((s) => s.computed !== undefined).at(-1);
      const values = shown?.text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return r.asks === 2 && storedInputs(r, a, b) && !!shown && Math.abs(shown.computed! - expected) < 0.0001 && values.some((v) => Math.abs(v - expected) < 0.0001) && (id !== "change" || letters(shown.text).includes("원"));
    });
    if (id === "pass") return decides([59, 60, 100, 0, 61, 35].map((score) => [score, score >= 60 ? "합격" : "불합격"]));
    if (id === "freethrow") return decides([9, 8, 7, 5, 4, 10, 6, 0, 2].map((count) => [count, count >= 8 ? "훌륭" : count >= 5 ? "잘했" : "연습"]));
    // Height and age, with each limit met, missed by one, and both missed.
    if (id === "ride") {
      const pairs = [[130, 10], [129, 10], [130, 9], [150, 15], [120, 8], [160, 9], [129, 30]], runs = pairs.map(([a, b]) => run("click", [String(a), String(b)]));
      return runs.every((r, i) => r.asks === 2 && storedInputs(r, pairs[i][0], pairs[i][1]) && r.usedLogic) && saysOnly(runs, pairs.map(([height, age]) => height >= 130 && age >= 10 ? "있어" : "없어"));
    }
    if (id === "square") return regular(visible(run("click", []).segments), 4, 100);
    if (id === "polygon") return [3, 5, 6, 4, 8, 7].every((sides) => { const r = run("click", [String(sides)]); return r.asks === 1 && regular(visible(r.segments, sides), sides); });
    // Ask in a loop until 1234 (the first question may come before it) and say the opening line
    // once, after the last question.
    // ‘안 열렸어요’ for a wrong try is not the opening line.
    if (id === "safe") return [["1234"], ["1111", "1234"], ["0000", "9999", "4321", "1234"], ["5555", "1233", "4312", "2341", "1234"]].every((tries) => {
      const r = run("click", tries), opened = r.sayings.filter((s) => outcomeOf(s.text, ["열렸", "안열렸"]) === "열렸");
      return r.asks === tries.length && r.asksInLoop >= tries.length - 1 && opened.length === 1 && opened[0].asks === tries.length;
    });
    if (id === "tree") return growTree();
    if (id === "cat-walk") return catWalk();
    if (id === "windows") return windows();
    if (id === "fix-shapes") return fixShapes();
    if (id === "flower") return flower();
    if (id === "paddle") return gradePaddle();
    if (id === "ball") return gradeBall(false);
    if (id === "brick") return gradeBrick();
    if (id === "brick-bounce") return gradeBrick() && gradeBall(true);
    if (id === "move") { const r = run("click", []); return Math.abs(r.x - 10) < 0.0001 && Math.abs(r.y) < 0.0001; }
    // The keys mission grades only the four arrow keys; the carried-over start line is optional. The
    // keys are pressed one after another in two orders, as on the stage, so a key that relies on the
    // direction it starts with (90) fails once another key has turned the dog.
    if (id === "keys") {
      const moves: Record<string, [number, number]> = { 38: [0, 10], 39: [10, 0], 40: [0, -10], 37: [-10, 0] };
      return [["38", "39", "40", "37"], ["39", "37", "40", "38"]].every((order) => {
        const m = machine([]);
        return order.every((key) => { const { x, y } = m.result(), r = run(key, [], m); return Math.abs(r.x - x - moves[key][0]) < 0.0001 && Math.abs(r.y - y - moves[key][1]) < 0.0001; });
      });
    }
    // A mission without its own rule never passes.
    return false;
  }
  try {
    if (grade()) return { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." };
    // Would it pass if ‘생각하기’ were speech? Then say so instead of the general hint.
    thinkSpeaks = true;
    try { if (grade()) return fail(THINKING_MESSAGE); } catch { /* the first result stands */ }
    // Right branches, wrong words? Then point at the words, not at the blocks.
    thinkSpeaks = false; wordingOnly = true;
    try { if (RESULT_WORDS[id] && grade()) return fail(wordingMessage(id)); } catch { /* the first result stands */ }
    return fail(mission.failure);
  } catch (error) { return fail(error instanceof MissionError ? error.message : mission.failure); }
}
