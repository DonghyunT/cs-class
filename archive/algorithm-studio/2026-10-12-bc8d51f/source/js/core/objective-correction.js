// A correction is attached to the exact objective answers, never to a seat alone.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ObjectiveCorrection=api;
})(typeof window!=='undefined'?window:null,function(){
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
    return value;
  }
  function sourceKey(student){
    return JSON.stringify(stable({attemptId:student?.attemptId||'',submittedAt:student?.submittedAt||null,part1:student?.answers?.part1||{},part2:student?.answers?.part2||{}}));
  }
  function get(student){
    const c=student?.objectiveCorrection;
    if(student?.status!=='submitted'||!c||c.attemptId!==student.attemptId||c.sourceKey!==sourceKey(student))return null;
    const b1 = Number.isInteger(c.beforePart1) ? c.beforePart1 : 0;
    const a1 = Number.isInteger(c.afterPart1) ? c.afterPart1 : b1;
    const b2 = Number.isInteger(c.beforePart2) ? c.beforePart2 : 0;
    const a2 = Number.isInteger(c.afterPart2) ? c.afterPart2 : b2;
    if (b1 < 0 || b1 > 30 || a1 < b1 || a1 > 30) return null;
    if (b2 < 0 || b2 > 30 || a2 < b2 || a2 > 30) return null;
    const expectedDelta = (a1 - b1) + (a2 - b2);
    if (expectedDelta <= 0 || c.delta !== expectedDelta) return null;
    return c;
  }
  return {sourceKey,get};
});
