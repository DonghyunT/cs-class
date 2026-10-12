import { validateFlowGraph } from './flow-graph.mjs';

export function quotaWindow(previous, now) {
  const day = new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const calls = (previous?.calls ?? []).filter(time => time > now - 60000);
  const count = previous?.day === day ? previous.count : 0;
  return { day, count, calls, allowed: count < 70 && calls.length < 15 };
}
export function parseSolarEnvelope(envelope) {
  if (envelope?.choices?.length !== 1 || envelope.choices[0].finish_reason !== 'stop' || typeof envelope.choices[0].message?.content !== 'string') throw new Error('AI_INCOMPLETE');
  return JSON.parse(envelope.choices[0].message.content);
}
export function hasDistinctOptions(options, count) {
  const words = options.map(value => value.replace(/\s/g, ''));
  return words.length === count && words.every(Boolean) && new Set(words).size === count;
}
export function groundFlowReview(result, checks, project) {
  if (result.verdict !== 'pass') return result;
  const uncertain = () => ({ ...result, verdict: 'uncertain', message: 'AI가 필수 조건과 실제 기호의 근거를 일치시키지 못했어요. 내용을 확인하거나 선생님 확인을 요청해 주세요.' });
  const conditions = project.conditions.map((text, index) => ({ text, index })).filter(c => c.text.trim());
  if (!conditions.length || checks.length !== conditions.length || new Set(checks.map(c => c.conditionIndex)).size !== checks.length) return uncertain();
  for (const { text, index } of conditions) {
    const check = checks.find(c => c.conditionIndex === index);
    if (!check) return uncertain();
    if (check.status === 'missing') return { ...result, verdict: 'needs-changes', message: `필수 조건 '${text}'을 실제 기호와 연결 흐름에 반영했는지 확인해 주세요.` };
    const sources = [{ nodeId: check.nodeId, evidence: check.evidence }, ...(check.additionalEvidence ?? [])];
    if (check.status !== 'met' || sources.some(source => {
      const node = project.nodes.find(n => n.id === source.nodeId);
      return !source.evidence?.trim() || node?.shape === 'terminal' || !node?.text.includes(source.evidence);
    })) return uncertain();
    if (check.appliesTo === 'every-path') {
      const graph = validateFlowGraph(project.nodes, project.edges.map(edge => ({ ...edge, fromPort: edge.label === '예' ? 'yes' : edge.label === '아니오' ? 'no' : 'out' })));
      if (!graph.valid) return uncertain();
      const visited = new Set(), todo = [graph.startId];
      while (todo.length) {
        const id = todo.pop();
        if (sources.some(source => source.nodeId === id) || visited.has(id)) continue;
        visited.add(id);
        const exits = graph.out.get(id) ?? [];
        if (!exits.length) return uncertain();
        exits.forEach(edge => todo.push(edge.to));
      }
    }
  }
  return result;
}
export function hasExplicitPreparation(input, actions) {
  const explicit = {
    OPEN_BAG: /(?:봉지|봉다리|빵\s*포장)[^,.!?\n]{0,15}(?:열|뜯|까|개봉|풀)/,
    OPEN_JAM: /잼[^,.!?\n]{0,15}(?:열|따|개봉)/,
    OPEN_PB: /(?:버터|땅콩)[^,.!?\n]{0,15}(?:열|따|개봉)/,
    SCOOP_JAM: /잼[^,.!?\n]{0,15}(?:묻|떠|뜨|퍼|푸)/,
    SCOOP_PB: /(?:버터|땅콩)[^,.!?\n]{0,15}(?:묻|떠|뜨|퍼|푸)/,
    UNWRAP_CHEESE: /치즈[^,.!?\n]{0,15}(?:벗|까|뜯|제거)/,
  };
  return actions.every(action => !explicit[action] || explicit[action].test(input));
}
