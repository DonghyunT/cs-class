import type { FlowchartProject } from "@/lib/classroom/review/project";

const svgStyles = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "color", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "paint-order", "marker-start", "marker-end", "visibility", "display"];

export async function flowchartPortfolio(project: FlowchartProject, svg: SVGSVGElement, review?: { status: string; message?: string }): Promise<Blob> {
  if (!svg.isConnected) throw Error("열린 자유 캔버스에서 작품 이미지를 만들어 주세요.");
  if (svg.querySelector("foreignObject")) throw Error("기호 문구 편집을 Enter로 마친 뒤 작품 이미지를 만들어 주세요.");
  if (!project.nodes.length) throw Error("순서도 기호를 추가한 뒤 작품 이미지를 만들어 주세요.");
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  if (!ctx) throw Error("이 브라우저에서는 작품 이미지를 만들 수 없어요.");

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...svg.querySelectorAll<SVGElement>("*")], targets = [clone, ...clone.querySelectorAll<SVGElement>("*")];
  sources.forEach((source, index) => {
    const style = getComputedStyle(source), target = targets[index];
    svgStyles.forEach(key => target.style.setProperty(key, style.getPropertyValue(key)));
    // Computed marker URLs may contain the page URL. The image needs its own local marker.
    for (const key of ["marker-start", "marker-end"]) {
      const value = style.getPropertyValue(key), id = value.match(/#([^\s"')]+)["']?\)/)?.[1];
      if (id) target.style.setProperty(key, `url(#${id})`);
    }
  });
  clone.querySelectorAll("[data-flow-controls], foreignObject").forEach(element => element.remove());
  // Keep the source and exported view independent: no clipping or saved pan changes.
  clone.style.cssText += ";position:fixed;left:-100000px;top:0;pointer-events:none;";
  clone.setAttribute("aria-hidden", "true");
  document.body.append(clone);
  let bounds: DOMRect;
  try { bounds = clone.getBBox(); } finally { clone.remove(); }
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || !bounds.width || !bounds.height) throw Error("순서도의 전체 범위를 읽지 못했어요. 캔버스를 확인하고 다시 시도해 주세요.");
  // Capture the diagram before awaiting fonts so a later edit cannot mix with this project's text.
  await document.fonts.ready;

  const pageWidth = 1200, padding = 48, textWidth = pageWidth - padding * 2, font = '18px system-ui, "Malgun Gothic", sans-serif', lineHeight = 28;
  ctx.font = font;
  const lines: { text: string; heading?: boolean }[] = [];
  function addLine(text: string, heading: boolean) {
    lines.push({ text, heading });
    if (lines.length > 400) throw Error("기획서 내용이 너무 길어 한 장의 이미지에 담을 수 없어요. 내용을 정리한 뒤 다시 만들어 주세요.");
  }
  function wrap(text: string, heading = false) {
    ctx!.font = heading ? 'bold 18px system-ui, "Malgun Gothic", sans-serif' : font;
    for (const paragraph of text.replace(/\r/g, "").split("\n")) {
      let line = "";
      for (const char of paragraph) {
        if (line && ctx!.measureText(line + char).width > textWidth) { addLine(line, heading); line = ""; }
        line += char;
      }
      addLine(line, heading);
    }
  }
  wrap("나의 순서도 작품", true);
  wrap("1. 해결할 문제", true);
  wrap(`현재 상태: ${project.current || "아직 작성하지 않았어요."}`);
  wrap(`목표 상태: ${project.goal || "아직 작성하지 않았어요."}`);
  wrap("필수 조건");
  project.conditions.filter(value => value.trim()).forEach((value, index) => wrap(`${index + 1}. ${value}`));
  if (!project.conditions.some(value => value.trim())) wrap("아직 작성하지 않았어요.");
  if (project.core.some(value => value.trim())) wrap(`핵심 요소: ${project.core.filter(value => value.trim()).join(" · ")}`);
  wrap("2. 자연어 알고리즘 기획서", true);
  project.cards.forEach((card, index) => {
    wrap(`${index + 1}. ${card.type === "sequence" ? "순차" : card.type === "selection" ? "선택" : "반복"}: ${card.text}`);
    if (card.type === "selection") { wrap(`   예: ${card.yes}`); wrap(`   아니오: ${card.no}`); }
    if (card.type === "loop") { wrap(`   반복할 행동: ${card.yes}`); if (card.no.trim()) wrap(`   반복이 끝난 뒤: ${card.no}`); }
  });
  if (!project.cards.length) wrap("아직 작성하지 않았어요.");
  wrap("3. 내보내기 시점의 점검", true);
  wrap(review?.status || "검사 상태 미포함");
  if (review?.message) wrap(review.message);
  wrap(`기호 ${project.nodes.length}개 · 연결 ${project.edges.length}개 · 판단 기호 ${project.nodes.filter(node => node.shape === "decision").length}개`);
  wrap("4. 기호와 화살표로 연결한 순서도", true);

  const margin = 32, graphWidth = bounds.width + margin * 2, graphHeight = bounds.height + margin * 2;
  const scale = Math.min(1, textWidth / graphWidth), imageHeight = Math.ceil(graphHeight * scale), textHeight = lines.reduce((sum, line) => sum + lineHeight + (line.heading ? 20 : 0), 0);
  // ponytail: a single readable PNG; ask the student to bring far-apart symbols closer rather than silently clipping a huge canvas.
  if (scale < 0.65) throw Error("기호가 너무 멀리 떨어져 있어 이미지에서 글씨를 읽기 어려워요. 기호를 가까이 모으거나 정렬한 뒤 다시 만들어 주세요.");
  const pageHeight = padding * 2 + textHeight + 24 + imageHeight;
  if (pageHeight > 12000 || pageWidth * pageHeight > 16_000_000) throw Error("작품이 너무 길어 한 장의 이미지에 담을 수 없어요. 기획서와 기호 배치를 정리한 뒤 다시 만들어 주세요.");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `${bounds.x - margin} ${bounds.y - margin} ${graphWidth} ${graphHeight}`);
  clone.setAttribute("width", String(graphWidth)); clone.setAttribute("height", String(graphHeight));
  clone.style.removeProperty("position"); clone.style.removeProperty("left"); clone.style.removeProperty("top");
  clone.style.width = `${graphWidth}px`; clone.style.height = `${graphHeight}px`; clone.style.display = "block"; clone.style.visibility = "visible";
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error("순서도 이미지를 읽지 못했어요. 편집을 마치고 다시 시도해 주세요.")); image.src = url; });
    canvas.width = pageWidth; canvas.height = pageHeight;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, pageWidth, pageHeight);
    let y = padding;
    for (const line of lines) {
      if (line.heading) {
        y += 12; ctx.fillStyle = "#eef2ff"; ctx.fillRect(padding - 12, y - 4, textWidth + 24, lineHeight + 8);
      }
      ctx.font = line.heading ? 'bold 18px system-ui, "Malgun Gothic", sans-serif' : font;
      ctx.fillStyle = line.heading ? "#3730a3" : "#1e293b";
      ctx.fillText(line.text, padding, y + 20); y += lineHeight + (line.heading ? 8 : 0);
    }
    ctx.drawImage(image, padding + (textWidth - graphWidth * scale) / 2, y + 24, graphWidth * scale, imageHeight);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("작품 이미지를 저장하지 못했어요. 다시 시도해 주세요.")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}
