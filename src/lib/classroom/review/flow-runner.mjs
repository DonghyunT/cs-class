import { validateFlowGraph } from './flow-graph.mjs';
import { parseFlowchartAssign, parseFlowchartCond, evalFlowchartAST, evalFlowchartCond } from './flow-expressions.mjs';
/** @typedef {{current:string,vars:Record<string,number|string>,previousVars:Record<string,number|string>,activeEdge?:{from:string,to:string,label:string},output?:{nodeId:string,text:string},log:string[],steps:number,done:boolean,waiting:null|{kind:'input'|'choice',name:string,inputMode?:'text'|'decimal'},error:string}} FlowRun */

/** @returns {FlowRun} */
export function createFlowRun(project) {
  const graph = validateFlowGraph(project.nodes, project.edges.map(e=>({...e,fromPort:e.label==='예'?'yes':e.label==='아니오'?'no':'out'})));
  return { current: graph.startId ?? '', vars: {}, previousVars: {}, log: [], steps: 0, done: false, waiting: null, error: graph.valid ? '' : graph.issues.map(i=>i.message).join(' ') };
}
/** @param {FlowRun} previous @param {string} [answer] @returns {FlowRun} */
export function stepFlowRun(project, previous, answer) {
  const run = structuredClone(previous);
  if (run.done || run.error && !(run.waiting?.kind === 'input' && answer !== undefined)) return run;
  run.error = '';
  const assignVariable = (name, value) => {
    if (Object.hasOwn(run.vars, name)) Object.defineProperty(run.previousVars, name, { value: run.vars[name], writable:true, enumerable:true, configurable:true });
    Object.defineProperty(run.vars, name, { value, writable:true, enumerable:true, configurable:true });
  };
  try {
    if (run.steps >= 300) throw Error('300단계 실행 한도에 도달했어요. 반복의 종료 조건을 확인해 주세요.');
    const node = project.nodes.find(n=>n.id===run.current);
    if (!node) throw Error('현재 기호를 찾을 수 없어요.');
    const text = node.text.trim(), exits = project.edges.filter(e=>e.from===node.id);
    let branch = '';
    if (run.waiting && answer === undefined) return run;
    if (node.shape === 'terminal' && /^(종료|끝|마침|도착)/.test(text)) { run.done=true; run.log.push('종료에 도달했어요.'); return run; }
    if (node.shape === 'process' && text.includes('=')) {
      const assign = parseFlowchartAssign(text), value = evalFlowchartAST(assign.ast,run.vars);
      if (typeof value !== 'string' && !Number.isFinite(value)) throw Error('계산 결과가 유한한 수가 아니에요.');
      assignVariable(assign.name, value); run.log.push(`${assign.name} = ${value}`);
    } else if (node.shape === 'io' && /입력|받기|센서|측정|감지/.test(text) && !/출력|표시/.test(text)) {
      const name = text.replace(/입력받기|입력|받기|센서|측정|감지/g,'').replace(/[()[\]:]/g,'').trim() || '값';
      const isText = project.textInputs?.includes(node.id) === true;
      const auto = project.inputPolicy === 'auto';
      if (answer === undefined) { run.waiting={kind:'input',name,inputMode:isText || auto?'text':'decimal'}; return run; }
      const numeric = String(answer).trim() !== '' && Number.isFinite(Number(answer));
      if (!isText && !auto && !numeric) throw Error('유한한 숫자를 입력해 주세요.');
      assignVariable(name, isText || auto && !numeric ? String(answer) : Number(answer)); run.log.push(`${name} 입력: ${answer}`);
    } else if (node.shape === 'decision') {
      const comparison = project.textComparisons?.[node.id];
      if (comparison) branch=run.vars[comparison.variable]===comparison.expected?'예':'아니오';
      else if (/[<>=!]/.test(text)) branch=evalFlowchartCond(parseFlowchartCond(text.replace(/\?$/,'')),run.vars)?'예':'아니오';
      else if (answer === undefined) { run.waiting={kind:'choice',name:text}; return run; }
      else if (answer==='예'||answer==='아니오') branch=answer;
      else throw Error('예 또는 아니오를 선택해 주세요.');
      run.log.push(`${text} → ${branch}`);
    } else if (node.shape === 'io' && /출력|표시|말하기|안내|띄우기|보여주기/.test(text)) {
      const expr=text.replace(/출력|표시|말하기|안내|띄우기|보여주기/g,'').trim();
      let value=expr.replace(/^["']|["']$/g,'');
      try { value=evalFlowchartAST(parseFlowchartAssign(`output = ${expr}`).ast,run.vars); } catch { /* Natural-language output is also valid. */ }
      run.log.push(`출력: ${value}`);
      run.output = { nodeId: node.id, text: String(value) };
    } else run.log.push(text);
    const next=exits.find(e=>e.label===branch);
    if (!next) throw Error(`'${branch || '다음'}' 연결이 없어요.`);
    run.activeEdge = { from: node.id, to: next.to, label: branch };
    run.waiting=null; run.current=next.to; run.steps++; return run;
  } catch (error) { run.error=error instanceof Error?error.message:'실행 내용을 확인해 주세요.'; return run; }
}
