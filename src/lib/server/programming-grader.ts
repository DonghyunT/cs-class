import { spritePictures, TRUSTED_SPRITES } from "../classroom/entry-palette";
import { COUNTER, missionBlockIssue, missionById, parseProgrammingProject, pictureId, type EntryNode } from "../classroom/programming-entry";

// Server-side grading. Kept out of the client bundle so fixed test inputs are not shipped to students.
class MissionError extends Error {}
// Thrown by ‘반복 중단하기’ and caught by the nearest loop.
class StopRepeat extends Error {}

// One run may evaluate at most this many blocks, keep this long a text and say this many lines.
const MAX_STEPS = 20_000, MAX_TEXT = 500, MAX_SPEECH = 50, MAX_REPEAT = 1000, MAX_SEGMENTS = 200;
// Event missions watch each forever loop for this many passes after every click.
const FRAMES = 4;
// Speech is compared without spaces and closing marks, so ‘불합격’ never counts as ‘합격’.
const spoken = (text: string) => text.replace(/[\s!.?~'"‘’“”]/g, "");

// Deterministic interpreter for the lessons' bounded blocks, following EntryJS 4.0.23 semantics.
// It never runs submitted JavaScript or accepts a client's claimed result.
export function checkProgrammingMission(id: string, raw: unknown): { passed: boolean; message: string } {
  const p = parseProgrammingProject(raw), mission = missionById(id);
  const fail = (message: string) => ({ passed: false, message });
  if (!p || !mission) return fail("작품을 읽지 못했어요. 입력한 블록은 유지하고 다시 확인해 주세요.");
  const issue = missionBlockIssue(id, raw);
  if (issue) return fail(issue);
  // An object running code: its shapes (by index) and what it said.
  type Actor = { id: string; count: number; index: number; said: string[] };
  // `observe` stops forever loops after a few passes and keeps them to rerun after events.
  function machine(inputs: string[], observe = false) {
    type Value = { value: string | number | boolean; input: boolean; computed?: number };
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false }, [COUNTER.id]: { value: 0, input: false } };
    let actor: Actor | null = null;
    const forevers: { body: EntryNode[]; actor: Actor | null }[] = [];
    let answer = "", asks = 0, x = 0, y = 0, direction = 90, speech = "", speaksInput = false, speechComputed: number | undefined;
    let steps = 0, speeches = 0, usedOr = false, rotation = 0, drawing = false, loopDepth = 0, asksInLoop = 0;
    const sayings: string[] = [];
    // Pen strokes, and whether each was drawn inside a loop.
    let segments: { from: [number, number]; to: [number, number]; inLoop: boolean }[] = [];
    const step = () => { if (++steps > MAX_STEPS) throw new MissionError("실행이 너무 길어요. 반복이나 조건을 다시 확인해 주세요."); };
    const number = (v: unknown) => { if (String(v).trim() === "" || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e6) throw new MissionError("실행할 숫자 입력을 확인해 주세요."); return Number(v); };
    // EntryJS compares a non-empty numeric string as a number.
    const comparable = (v: string | number | boolean) => typeof v === "string" && v.length && !Number.isNaN(Number(v)) ? Number(v) : v;
    const usesAB = (n: unknown): boolean => !!n && typeof n === "object" && ((n as EntryNode).type === "get_variable" && ["cs-A", "cs-B"].includes(String((n as EntryNode).params[0])) || (n as EntryNode).params.some(usesAB));
    function evaluate(n: EntryNode): Value {
      step();
      if (["text", "number", "angle"].includes(n.type)) return { value: n.params[0] as string | number, input: false };
      if (n.type === "True" || n.type === "False") return { value: n.type === "True", input: false };
      if (n.type === "get_canvas_input_value") return { value: answer, input: asks > 0 };
      if (n.type === "get_variable") return variables[String(n.params[0])];
      if (n.type === "get_pictures") return { value: String(n.params[0] ?? ""), input: false };
      // No mouse button is held between the simulated clicks.
      if (n.type === "is_clicked") return { value: false, input: false };
      if (n.type === "boolean_not") return { value: !evaluate(n.params[1] as EntryNode).value, input: false };
      if (n.type === "quotient_and_mod") {
        const a = number(evaluate(n.params[1] as EntryNode).value), b = number(evaluate(n.params[3] as EntryNode).value);
        if (b === 0) throw new MissionError("0으로 나눌 수 없어요.");
        return { value: n.params[5] === "QUOTIENT" ? Math.floor(a / b) : a - b * Math.floor(a / b), input: false };
      }
      const left = evaluate(n.params[n.type === "combine_something" ? 1 : 0] as EntryNode), right = evaluate(n.params[n.type === "combine_something" ? 3 : 2] as EntryNode);
      if (n.type === "combine_something") {
        const text = String(left.value) + String(right.value);
        if (text.length > MAX_TEXT) throw new MissionError("글자가 너무 길어요.");
        return { value: text, input: left.input || right.input, computed: left.computed === undefined ? right.computed : right.computed === undefined ? left.computed : undefined };
      }
      if (n.type === "boolean_and_or") {
        if (n.params[1] === "OR" && usesAB(n)) usedOr = true;
        return { value: n.params[1] === "OR" ? Boolean(left.value) || Boolean(right.value) : Boolean(left.value) && Boolean(right.value), input: false };
      }
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
    const say = (value: Value) => {
      if (++speeches > MAX_SPEECH) throw new MissionError("말하기가 너무 많아요.");
      speech = String(value.value); speaksInput = value.input; speechComputed = value.computed; sayings.push(speech); actor?.said.push(speech);
    };
    // EntryJS moves along direction + rotation and draws while the pen is down.
    const goTo = (nextX: number, nextY: number) => {
      if (drawing && (Math.abs(nextX - x) > 1e-9 || Math.abs(nextY - y) > 1e-9)) {
        if (segments.length >= MAX_SEGMENTS) throw new MissionError("선을 너무 많이 그렸어요.");
        segments.push({ from: [x, y], to: [nextX, nextY], inLoop: loopDepth > 0 });
      }
      x = nextX; y = nextY;
    };
    function loop(body: EntryNode[], next: () => boolean, forever = false) {
      if (forever && observe) { forevers.push({ body, actor }); let left = FRAMES; next = () => left-- > 0; }
      loopDepth++;
      try { while (next()) { step(); try { exec(body); } catch (error) { if (error instanceof StopRepeat) break; throw error; } } }
      finally { loopDepth--; }
    }
    function exec(list: EntryNode[]) {
      for (const n of list) {
        step();
        if (n.type === "ask_and_wait") { if (asks >= inputs.length) throw new MissionError("이번 목표에 필요한 질문을 차례로 연결해 주세요."); answer = inputs[asks++]; if (loopDepth) asksInLoop++; }
        else if (n.type === "set_variable") variables[String(n.params[0])] = evaluate(n.params[1] as EntryNode);
        else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw new MissionError("말하기 시간은 0~10초로 정해 주세요."); if (n.params[2] === "speak") say(value); }
        else if (n.type === "dialog") { const value = evaluate(n.params[0] as EntryNode); if (n.params[1] !== "think") say(value); }
        else if (n.type === "_if") { if (evaluate(n.params[0] as EntryNode).value) exec(n.statements?.[0] ?? []); }
        else if (n.type === "if_else") exec(n.statements?.[evaluate(n.params[0] as EntryNode).value ? 0 : 1] ?? []);
        else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value), angle = (direction + rotation) * Math.PI / 180; goTo(x + Math.sin(angle) * distance, y + Math.cos(angle) * distance); }
        else if (n.type === "direction_relative") direction += number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "rotate_relative") rotation += number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "locate_xy") goTo(number(evaluate(n.params[0] as EntryNode).value), number(evaluate(n.params[1] as EntryNode).value));
        else if (n.type === "start_drawing" || n.type === "stop_drawing") drawing = n.type === "start_drawing";
        else if (n.type === "brush_erase_all") segments = [];
        else if (["wait_second", "set_color", "set_thickness"].includes(n.type)) continue;
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
          const target = variables[String(n.params[0])];
          if (!target) throw new MissionError("더할 변수를 골라 주세요.");
          variables[String(n.params[0])] = { value: number(number(target.value) + number(evaluate(n.params[1] as EntryNode).value)), input: false };
        }
        else if (n.type === "change_to_next_shape" || n.type === "change_to_some_shape") {
          if (!actor || actor.count < 2) throw new MissionError("모양이 여러 개인 오브젝트에서 모양을 바꿔 주세요.");
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
        else throw new MissionError("시작 블록은 맨 위에 두고 동작을 아래로 연결해 주세요.");
      }
    }
    const result = () => ({ variables, asks, x, y, speech, speaksInput, speechComputed, usedOr, segments, asksInLoop, sayings });
    return {
      result, variables,
      run(list: EntryNode[], who: Actor | null) { actor = who; exec(list); },
      // One more watch of every forever loop, as frames passing on the stage.
      frames() { for (const { body, actor: who } of [...forevers]) { actor = who; let left = FRAMES; loop(body, () => left-- > 0); } },
    };
  }
  function run(signal: string, inputs: string[]) {
    // A dog-free project runs the start line of whichever object owns it (missionBlockIssue keeps it to one object).
    const lines = (p!.free ? p!.added.flatMap((o) => o.threads) : p!.threads).filter((t) => signal === "click" ? t[0]?.type === "when_run_button_click" : t[0]?.type === "when_some_key_pressed" && t[0].params[1] === signal);
    if (lines.length !== 1) throw new MissionError("시작 신호마다 한 줄의 코드를 연결해 주세요.");
    const m = machine(inputs);
    m.run(lines[0].slice(1), null);
    return m.result();
  }
  // The tree must grow one shape at a time with clicks, never on its own, and speak when grown.
  function growTree() {
    const tree = p!.added.find((o) => o.sprite === "tree-growth");
    if (!tree) throw new MissionError("나무 오브젝트가 없어요. ‘처음 작품으로’ 버튼으로 시작 작품을 다시 불러와 주세요.");
    const actorOf = (id: string, sprite: string, index = 0): Actor => ({ id, count: spritePictures(TRUSTED_SPRITES.find((item) => item.id === sprite)!).length, index, said: [] });
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
  // A closed regular polygon with `sides` equal strokes, all drawn inside a loop.
  const regular = (strokes: { from: [number, number]; to: [number, number]; inLoop: boolean }[], sides: number, length?: number) => {
    if (strokes.length !== sides || !strokes.every((s) => s.inLoop)) return false;
    const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;
    const lengths = strokes.map((s) => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]));
    const headings = strokes.map((s) => Math.atan2(s.to[0] - s.from[0], s.to[1] - s.from[1]) * 180 / Math.PI);
    const turns = headings.map((h, i) => ((headings[(i + 1) % sides] - h) % 360 + 540) % 360 - 180);
    return lengths.every((l) => l > 1 && Math.abs(l - lengths[0]) < 0.01 && (length === undefined || Math.abs(l - length) < 0.01))
      && strokes.every((s, i) => near(s.to, strokes[(i + 1) % sides].from))
      && turns.every((t) => Math.abs(t - turns[0]) < 0.5 && Math.abs(Math.abs(t) - 360 / sides) < 0.5);
  };
  // Every case asks once and must say exactly the expected words.
  const says = (cases: [number, string][]) => cases.every(([input, expected]) => { const r = run("click", [String(input)]); return r.asks === 1 && spoken(r.speech) === spoken(expected); });
  try {
    let passed: boolean;
    if (id === "name") passed = ["초코", "보리"].every((value) => { const r = run("click", [value]); return r.asks === 1 && r.speaksInput && r.speech.includes(value); });
    else if (id === "multiply" || id === "average") passed = [[6, 4], [3, 7], [-2, 5], [0, 9]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]), expected = id === "multiply" ? a * b : (a + b) / 2;
      const values = r.speech.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      // A and B must hold the two inputs, in either order: asking for B first is also correct.
      const stored = [Number(r.variables["cs-A"].value), Number(r.variables["cs-B"].value)];
      const inOrder = stored[0] === a && stored[1] === b, swapped = stored[0] === b && stored[1] === a;
      return r.asks === 2 && r.variables["cs-A"].input && r.variables["cs-B"].input && (inOrder || swapped) && r.speechComputed !== undefined && Math.abs(r.speechComputed - expected) < 0.0001 && values.some((v) => Math.abs(v - expected) < 0.0001);
    });
    else if (id === "pass") passed = says([59, 60, 100, 0, 61, 35].map((score) => [score, score >= 60 ? "합격" : "불합격"]));
    else if (id === "freethrow") passed = says([9, 8, 7, 5, 4, 10, 6, 0, 2].map((count) => [count, count >= 8 ? "훌륭해요!" : count >= 5 ? "잘했어요!" : "더 연습해 보자!"]));
    else if (id === "escape") passed = [[1, 1], [1, 0], [0, 1], [0, 0]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]);
      const stored = [Number(r.variables["cs-A"].value), Number(r.variables["cs-B"].value)];
      return r.asks === 2 && (stored[0] === a && stored[1] === b || stored[0] === b && stored[1] === a) && r.usedOr && spoken(r.speech) === spoken(a || b ? "탈출 성공!" : "탈출 실패");
    });
    else if (id === "square") passed = regular(run("click", []).segments, 4, 100);
    else if (id === "polygon") passed = [3, 5, 6, 4, 8].every((sides) => { const r = run("click", [String(sides)]); return r.asks === 1 && regular(r.segments, sides); });
    // Ask in a loop until 1234 and say the opening line once, at the end.
    else if (id === "safe") passed = [["1234"], ["1111", "1234"], ["0000", "9999", "4321", "1234"], ["5555", "1233", "4312", "2341", "1234"]].every((tries) => {
      const r = run("click", tries), opened = r.sayings.filter((line) => spoken(line) === spoken("금고가 열렸어요!"));
      return r.asks === tries.length && r.asksInLoop === tries.length && opened.length === 1 && spoken(r.speech) === spoken("금고가 열렸어요!");
    });
    else if (id === "tree") passed = growTree();
    else if (id === "move" || id === "keys") {
      const move = (signal: string, x: number, y: number) => { const r = run(signal, []); return Math.abs(r.x - x) < 0.0001 && Math.abs(r.y - y) < 0.0001; };
      // The keys mission grades only the four arrow keys; the carried-over start line is optional.
      passed = id === "move" ? move("click", 10, 0) : [["38", 0, 10], ["39", 10, 0], ["40", 0, -10], ["37", -10, 0]].every(([key, x, y]) => move(String(key), Number(x), Number(y)));
    }
    // A mission without its own rule never passes.
    else passed = false;
    return passed ? { passed: true, message: "목표 조건을 확인했어요. 작품을 제출하면 이 미션이 완료돼요." } : fail(mission.failure ?? mission.hint);
  } catch (error) { return fail(error instanceof MissionError ? error.message : mission.failure ?? mission.hint); }
}
