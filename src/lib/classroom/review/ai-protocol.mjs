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
