export function problemMessage(problem: unknown) {
  return problem instanceof Error ? problem.message : "정보를 불러오지 못했어요. 다시 시도해 주세요.";
}

export function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(timestamp);
}
