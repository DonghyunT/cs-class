import { HARMLESS_BLOCKS, spritePictures, THINKING_MESSAGE, TRUSTED_SPRITES } from "../classroom/entry-palette";
import { COUNTER, KEY_LABELS, missionBlockIssue, missionById, parseProgrammingProject, pictureId, type EntryNode } from "../classroom/programming-entry";

// Server-side grading. Kept out of the client bundle so fixed test inputs are not shipped to students.
class MissionError extends Error {}
// Thrown by ‘반복 중단하기’ and caught by the nearest loop.
class StopRepeat extends Error {}

// One run may evaluate at most this many blocks, keep this long a text and say this many lines.
const MAX_STEPS = 20_000, MAX_TEXT = 500, MAX_SPEECH = 50, MAX_REPEAT = 1000, MAX_SEGMENTS = 200;
// Event missions watch each forever loop for this many passes after every click.
const FRAMES = 4;
// Speech keeps only letters and digits, so spaces, punctuation and emoji never matter.
const letters = (text: string) => text.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
// Each result's key word. A word that holds another (‘불합격’ ⊃ ‘합격’) is removed before the
// shorter one is looked for. A line with no word is a greeting; one with two is unclear (null).
const wordsIn = (line: string, words: readonly string[]) => words.filter((word) => words.reduce((rest, other) => other !== word && other.includes(word) ? rest.split(other).join("") : rest, letters(line)).includes(word));
const outcomeOf = (line: string, words: readonly string[]) => { const found = wordsIn(line, words); return found.length > 1 ? null : found[0] ?? ""; };
// Each decision mission's result words.
const RESULT_WORDS: Record<string, readonly string[]> = { pass: ["합격", "불합격"], freethrow: ["훌륭", "잘했", "연습"], escape: ["성공", "실패"] };
// A decision whose branches are right but whose lines mix in another result's word.
export const wordingMessage = (words: readonly string[]) => `조건은 맞게 나눴어요. 그런데 결과를 알리는 말에 다른 결과의 낱말도 들어 있어요. 결과마다 ${words.map((w) => `‘${w}’`).join("·")} 중 그 결과의 낱말만 말하게 해 주세요.`;
// Entry 4.0.23 `Entry.Utils.isNumber`: ‘+’ adds these and joins anything else as text.
const numeric = (v: unknown) => typeof v === "number" || typeof v === "string" && /^-?\d+\.?\d*(?:[eE][+-]?\d+)?$/.test(v);

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
  // A failed check is run once more with ‘생각하기’ counted as speech, to say why it failed,
  // and a failed decision once more with only the wording relaxed (`wordingOnly`).
  let thinkSpeaks = false, wordingOnly = false;
  // `observe` stops forever loops after a few passes and keeps them to rerun after events.
  function machine(inputs: string[], observe = false) {
    type Value = { value: string | number | boolean; input: boolean; computed?: number };
    const variables: Record<string, Value> = { "cs-A": { value: 0, input: false }, "cs-B": { value: 0, input: false }, [COUNTER.id]: { value: 0, input: false } };
    // The first answer stored in each variable, so a result saved over A later still counts.
    const firstInput: Record<string, Value> = {};
    let actor: Actor | null = null;
    const forevers: { body: EntryNode[]; actor: Actor | null }[] = [];
    let answer = "", asks = 0, x = 0, y = 0, direction = 90;
    let steps = 0, speeches = 0, usedLogic = false, rotation = 0, drawing = false, loopDepth = 0, asksInLoop = 0;
    // True from a loop's second pass on: a stroke drawn then is drawn by repetition.
    let again = false;
    // Every line said, with whether it came from an answer, the calculation it shows and how many questions came before.
    const sayings: { text: string; input: boolean; computed?: number; asks: number }[] = [];
    // Pen strokes, whether each was drawn inside a loop that ran twice or more and whether on a repeated pass.
    let segments: Stroke[] = [];
    // The strokes drawn inside each running loop, marked `repeated` when that loop ends after two or more passes.
    const open: Stroke[][] = [];
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
      if (n.type === "combine_something" || n.type === "calc_basic" && n.params[1] === "PLUS" && [left.value, right.value].some((v) => typeof v === "string" && v !== "" && !numeric(v))) {
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
        const stroke: Stroke = { from: [x, y], to: [nextX, nextY], repeated: false, again };
        segments.push(stroke); for (const list of open) list.push(stroke);
      }
      x = nextX; y = nextY;
    };
    function loop(body: EntryNode[], next: () => boolean, forever = false) {
      if (forever && observe) { forevers.push({ body, actor }); let left = FRAMES; next = () => left-- > 0; }
      loopDepth++;
      const outer = again, drawn: Stroke[] = []; let passes = 0;
      open.push(drawn);
      try { while (next()) { step(); again = outer || passes++ > 0; try { exec(body); } catch (error) { if (error instanceof StopRepeat) break; throw error; } } }
      finally { loopDepth--; again = outer; open.pop(); if (passes > 1) for (const s of drawn) s.repeated = true; }
    }
    function exec(list: EntryNode[]) {
      for (const n of list) {
        step();
        if (n.type === "ask_and_wait") { if (asks >= inputs.length) throw new MissionError("이번 목표에 필요한 질문을 차례로 연결해 주세요."); answer = inputs[asks++]; if (loopDepth) asksInLoop++; }
        else if (n.type === "set_variable") {
          const value = evaluate(n.params[1] as EntryNode), id = String(n.params[0]);
          variables[id] = value;
          if (value.input && value.computed === undefined && !firstInput[id]) firstInput[id] = value;
        }
        else if (n.type === "dialog_time") { const value = evaluate(n.params[0] as EntryNode); const seconds = number(evaluate(n.params[1] as EntryNode).value); if (seconds < 0 || seconds > 10) throw new MissionError("말하기 시간은 0~10초로 정해 주세요."); say(value, n.params[2]); }
        else if (n.type === "dialog") say(evaluate(n.params[0] as EntryNode), n.params[1]);
        else if (n.type === "_if") { if (evaluate(n.params[0] as EntryNode).value) exec(n.statements?.[0] ?? []); }
        else if (n.type === "if_else") exec(n.statements?.[evaluate(n.params[0] as EntryNode).value ? 0 : 1] ?? []);
        else if (n.type === "direction_absolute") direction = number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "move_direction") { const distance = number(evaluate(n.params[0] as EntryNode).value), angle = (direction + rotation) * Math.PI / 180; goTo(x + Math.sin(angle) * distance, y + Math.cos(angle) * distance); }
        else if (n.type === "direction_relative") direction += number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "rotate_relative") rotation += number(evaluate(n.params[0] as EntryNode).value);
        else if (n.type === "locate_xy") goTo(number(evaluate(n.params[0] as EntryNode).value), number(evaluate(n.params[1] as EntryNode).value));
        else if (n.type === "move_x") goTo(x + number(evaluate(n.params[0] as EntryNode).value), y);
        else if (n.type === "move_y") goTo(x, y + number(evaluate(n.params[0] as EntryNode).value));
        // Timed moves and turns end where Entry's frames end; the seconds do not change the result.
        else if (n.type === "move_xy_time") goTo(x + number(evaluate(n.params[1] as EntryNode).value), y + number(evaluate(n.params[2] as EntryNode).value));
        else if (n.type === "locate_xy_time") goTo(number(evaluate(n.params[1] as EntryNode).value), number(evaluate(n.params[2] as EntryNode).value));
        else if (n.type === "rotate_by_time") rotation += number(evaluate(n.params[1] as EntryNode).value);
        else if (n.type === "direction_relative_duration") direction += number(evaluate(n.params[1] as EntryNode).value);
        // ‘( ) 방향으로 ( )만큼 움직이기’ ignores the object's direction.
        else if (n.type === "move_to_angle") { const angle = number(evaluate(n.params[0] as EntryNode).value) * Math.PI / 180, distance = number(evaluate(n.params[1] as EntryNode).value); goTo(x + Math.sin(angle) * distance, y + Math.cos(angle) * distance); }
        else if (n.type === "start_drawing" || n.type === "stop_drawing") drawing = n.type === "start_drawing";
        else if (n.type === "brush_erase_all") segments = [];
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
    const result = () => ({ variables, firstInput, asks, x, y, usedLogic, segments, asksInLoop, sayings });
    return {
      result, variables,
      run(list: EntryNode[], who: Actor | null) { actor = who; exec(list); },
      // One more watch of every forever loop, as frames passing on the stage.
      frames() { for (const { body, actor: who } of [...forevers]) { actor = who; let left = FRAMES; loop(body, () => left-- > 0); } },
    };
  }
  function run(signal: string, inputs: string[], m = machine(inputs)) {
    // A dog-free project runs the start line of whichever object owns it (missionBlockIssue keeps it to one object).
    const lines = (p!.free ? p!.added.flatMap((o) => o.threads) : p!.threads).filter((t) => signal === "click" ? t[0]?.type === "when_run_button_click" : t[0]?.type === "when_some_key_pressed" && t[0].params[1] === signal);
    if (lines.length > 1) throw new MissionError(signal === "click" ? "‘시작하기 버튼을 클릭했을 때’ 줄이 여러 개예요. 한 줄로 이어 붙여 주세요." : `‘${KEY_LABELS[signal]} 키를 눌렀을 때’ 줄이 여러 개예요. 키마다 한 줄로 이어 붙여 주세요.`);
    // tests/fixtures/entry-legacy-keys.json pins this wording for a missing line.
    if (!lines.length) throw new MissionError("시작 신호마다 한 줄의 코드를 연결해 주세요.");
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
  type Stroke = { from: [number, number]; to: [number, number]; repeated: boolean; again: boolean };
  const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;
  const heading = (s: Stroke) => Math.atan2(s.to[0] - s.from[0], s.to[1] - s.from[1]) * 180 / Math.PI;
  // Strokes as the stage shows them: a side drawn in pieces is one side (repeated only if every
  // piece was), and a line drawn again over an earlier one adds nothing. With `laps`, lines are
  // drawn over only in whole laps, so a fixed repeat count cannot stand in for the answer.
  const visible = (strokes: Stroke[], laps?: number) => {
    const sides = strokes.reduce<Stroke[]>((list, s) => {
      const last = list.at(-1);
      if (last && near(last.to, s.from) && Math.abs(((heading(s) - heading(last)) % 360 + 540) % 360 - 180) < 0.01) list[list.length - 1] = { from: last.from, to: s.to, repeated: last.repeated && s.repeated, again: last.again || s.again };
      else list.push(s);
      return list;
    }, []);
    if (laps && sides.length % laps) return sides;
    return sides.filter((s, i) => !sides.slice(0, i).some((t) => near(t.from, s.from) && near(t.to, s.to) || near(t.from, s.to) && near(t.to, s.from)));
  };
  // A closed regular polygon with `sides` equal strokes: every side drawn inside a loop that ran
  // twice or more, and some side on a repeated pass (so ‘1번 반복’ around most sides fails).
  const regular = (strokes: Stroke[], sides: number, length?: number) => {
    if (strokes.length !== sides || !strokes.every((s) => s.repeated) || !strokes.some((s) => s.again)) return false;
    const lengths = strokes.map((s) => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]));
    const headings = strokes.map(heading);
    const turns = headings.map((h, i) => ((headings[(i + 1) % sides] - h) % 360 + 540) % 360 - 180);
    return lengths.every((l) => l > 1 && Math.abs(l - lengths[0]) < 0.01 && (length === undefined || Math.abs(l - length) < 0.01))
      && strokes.every((s, i) => near(s.to, strokes[(i + 1) % sides].from))
      && turns.every((t) => Math.abs(t - turns[0]) < 0.5 && Math.abs(Math.abs(t) - 360 / sides) < 0.5);
  };
  type Run = ReturnType<typeof run>;
  // Lines said after the last question; greetings and lines said before the answers are in
  // (‘합격 기준은 60점이야’) are never results.
  const after = (r: Run) => r.sayings.filter((s) => s.asks === r.asks).map((s) => s.text);
  // In every case some line says a result, and every line that does says the expected one.
  // `wordingOnly` asks whether the branches are right and only the wording is not: lines every case
  // says are dropped, and the first remaining line with a result word must hold the expected one.
  const saysOnly = (runs: Run[], expected: string[]) => runs.every((r, i) => {
    if (wordingOnly) return !!after(r).filter((t) => !runs.every((o) => after(o).includes(t))).map((t) => wordsIn(t, RESULT_WORDS[id])).find((f) => f.length)?.includes(expected[i]);
    const results = after(r).map((t) => outcomeOf(t, RESULT_WORDS[id])).filter((o) => o !== "");
    return results.length > 0 && results.every((o) => o === expected[i]);
  });
  // A and B must first store the two inputs, in either order: asking for B first is also correct.
  const storedInputs = (r: Run, a: number, b: number) => {
    const stored = [Number(r.firstInput["cs-A"]?.value), Number(r.firstInput["cs-B"]?.value)];
    return !!r.firstInput["cs-A"] && !!r.firstInput["cs-B"] && (stored[0] === a && stored[1] === b || stored[0] === b && stored[1] === a);
  };
  // Every case asks once and says only the expected result.
  const decides = (cases: [number, string][]) => { const runs = cases.map(([input]) => run("click", [String(input)])); return runs.every((r) => r.asks === 1) && saysOnly(runs, cases.map((c) => c[1])); };
  function grade(): boolean {
    if (id === "name") return ["초코", "보리"].every((value) => { const r = run("click", [value]); return r.asks === 1 && r.sayings.some((s) => s.input && s.text.includes(value)); });
    if (id === "multiply" || id === "average") return [[6, 4], [3, 7], [-2, 5], [0, 9]].every(([a, b]) => {
      const r = run("click", [String(a), String(b)]), expected = id === "multiply" ? a * b : (a + b) / 2;
      // The last line that shows a calculation from the inputs is the answer; a closing line may follow.
      const shown = r.sayings.filter((s) => s.computed !== undefined).at(-1);
      const values = shown?.text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return r.asks === 2 && storedInputs(r, a, b) && !!shown && Math.abs(shown.computed! - expected) < 0.0001 && values.some((v) => Math.abs(v - expected) < 0.0001);
    });
    if (id === "pass") return decides([59, 60, 100, 0, 61, 35].map((score) => [score, score >= 60 ? "합격" : "불합격"]));
    if (id === "freethrow") return decides([9, 8, 7, 5, 4, 10, 6, 0, 2].map((count) => [count, count >= 8 ? "훌륭" : count >= 5 ? "잘했" : "연습"]));
    if (id === "escape") {
      const pairs = [[1, 1], [1, 0], [0, 1], [0, 0]], runs = pairs.map(([a, b]) => run("click", [String(a), String(b)]));
      return runs.every((r, i) => r.asks === 2 && storedInputs(r, pairs[i][0], pairs[i][1]) && r.usedLogic) && saysOnly(runs, pairs.map(([a, b]) => a || b ? "성공" : "실패"));
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
    try { if (RESULT_WORDS[id] && grade()) return fail(wordingMessage(RESULT_WORDS[id])); } catch { /* the first result stands */ }
    return fail(mission.failure ?? mission.hint);
  } catch (error) { return fail(error instanceof MissionError ? error.message : mission.failure ?? mission.hint); }
}
