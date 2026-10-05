/* Shared structural validation and bounded, deterministic assessment execution. */
function validateFlowGraph(blocks = [], connections = []) {
  const issues = [];
  const add = (id, message) => issues.push({ blockId: id || null, message });
  if (!Array.isArray(blocks) || !Array.isArray(connections) || blocks.length > 200 || connections.length > 400) {
    return { valid: false, issues: [{ blockId: null, message: '순서도 자료의 크기나 형식을 확인해 주세요.' }] };
  }
  const nodes = new Map();
  for (const block of blocks) {
    if (!block || typeof block.id !== 'string' || !/^[\w-]+$/.test(block.id) || nodes.has(block.id) || !['terminal','io','decision','process'].includes(block.shape)) {
      add(null, '기호 정보를 확인해 주세요.'); continue;
    }
    nodes.set(block.id, block);
    if (typeof block.text !== 'string' || !block.text.trim() || block.text.trim() === '내용 입력') add(block.id, '이 기호의 내용이 비어 있습니다.');
  }
  const starts = blocks.filter(b => b?.shape === 'terminal' && typeof b.text === 'string' && /^(?:시작|출발)/.test(b.text.trim().replace(/[!?.~]/g, '')));
  const ends = blocks.filter(b => b?.shape === 'terminal' && typeof b.text === 'string' && /^(?:종료|끝|마침|도착)/.test(b.text.trim().replace(/[!?.~]/g, '')));
  if (starts.length !== 1) add(null, '시작 기호를 하나 지정해 주세요.');
  if (!ends.length) add(null, '종료 기호를 확인해 주세요.');
  const out = new Map(), incoming = new Map();
  for (const edge of connections) {
    if (!edge || !nodes.has(edge.from) || !nodes.has(edge.to)) { add(null, '연결선 끝의 기호를 찾을 수 없습니다.'); continue; }
    if (!out.has(edge.from)) out.set(edge.from, []);
    out.get(edge.from).push(edge);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    incoming.get(edge.to).push(edge);
  }
  for (const [id, block] of nodes) {
    const exits = out.get(id) || [];
    if (ends.includes(block)) { if (exits.length) add(id, '종료 기호 뒤에 연결선이 있습니다.'); }
    else if (block.shape === 'decision') {
      if (exits.length !== 2 || !exits.some(e => e.fromPort === 'yes') || !exits.some(e => e.fromPort === 'no')) add(id, '이 판단 기호의 예·아니오 연결을 확인해 주세요.');
    } else if (exits.length !== 1) add(id, '이 기호에서 다음 단계로 이어지는 연결을 확인해 주세요.');
  }
  if (starts.length === 1) {
    const visited = new Set(), todo = [starts[0].id];
    while (todo.length) { const id = todo.pop(); if (visited.has(id)) continue; visited.add(id); (out.get(id)||[]).forEach(e=>todo.push(e.to)); }
    for (const id of nodes.keys()) if (!visited.has(id)) add(id, '시작에서 이 기호까지 연결되지 않았습니다.');
    const canEnd = new Set(), back = ends.map(b=>b.id);
    while (back.length) { const id = back.pop(); if (canEnd.has(id)) continue; canEnd.add(id); (incoming.get(id)||[]).forEach(e=>back.push(e.from)); }
    for (const id of visited) {
      if (!canEnd.has(id)) {
        const block = nodes.get(id);
        if (block?.shape === 'decision') {
          add(id, `판단 기호('${block.text || id}')의 '예' 또는 '아니오' 분기 중 하나가 종료로 이어지지 않습니다.`);
        } else {
          add(id, `'${block?.text || id}' 단계에서 종료로 이어지는 길이 없습니다.`);
        }
      }
    }
  }
  return { valid: issues.length === 0, issues, nodes, out, startId: starts[0]?.id };
}


export { validateFlowGraph };
