"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { useWork } from "../use-work";
import { basicReviewCheck, sameReviewProject } from "@/lib/classroom/review/project";
import type { AiResult, AiTask } from "@/lib/classroom/review/ai";
import styles from "./review.module.css";
export type ReviewController = ReturnType<typeof useWork>;
export function useReviewAi(controller: ReviewController) {
  const [result, setResult] = useState<AiResult | null>(null), [error, setError] = useState(""), [remaining, setRemaining] = useState<number | null>(null);
  async function ask(task: AiTask, input: string, missionId?: string) {
    setError(""); setResult(null);
    try { const reply = await controller.requestAi(task, input, missionId); if (reply) { setResult(reply.result); setRemaining(reply.remaining); } else setError("작품이 바뀌었거나 저장을 완료하지 못했어요. 현재 입력을 확인하고 다시 요청해 주세요."); }
    catch (error) { setError(error instanceof Error ? error.message : "AI 도움을 받지 못했어요. 입력은 보존됩니다."); }
  }
  const clear = useCallback(() => { setResult(null); setError(""); }, []);
  return { result, error, remaining, ask, clear };
}
export function ReviewSubmit({ controller, missionId }: { controller: ReviewController; missionId?: string }) {
  const { draft, work } = controller, project = draft.reviewProject!, saved = missionId ? work.missions?.[missionId] : work;
  const valid = saved?.validation?.passed && sameReviewProject(project, saved.validation.reviewProject, missionId), submitted = sameReviewProject(project, saved?.submission?.reviewProject, missionId);
  const [focus, setFocus] = useState(0), feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus) feedback.current?.focus(); }, [focus]);
  async function action(type: "validate-practice" | "submit-practice" | "request-review") { if (await controller.perform({ type, ...(missionId ? { missionId } : {}) })) setFocus(value => value + 1); }
  const canRequest = basicReviewCheck(project, missionId).passed && work.aiReview && sameReviewProject(project, work.aiReview.project, missionId) && work.aiReview.verdict !== "pass";
  return <section className={styles.panel} aria-label="작품 검증과 제출"><h3>복습 기록 남기기</h3><p className={styles.muted}>이 활동은 성적에 반영하지 않아요. 제출본과 현재 수정본은 따로 유지돼요.</p><div className={styles.actions}><Button disabled={controller.busy || controller.aiBusy} onClick={() => void action("validate-practice")}>작품 검증</Button><Button variant="outline" disabled={controller.busy || controller.aiBusy || !valid || submitted} onClick={() => void action("submit-practice")}>{submitted ? "이 작품 제출 완료" : saved?.submission ? "수정한 작품 제출" : "작품 제출"}</Button>{canRequest && <Button variant="outline" disabled={controller.busy || controller.aiBusy} onClick={() => void action("request-review")}>선생님 확인 요청</Button>}</div><div ref={feedback} tabIndex={-1} role="status">{saved?.validation && sameReviewProject(project, saved.validation.reviewProject, missionId) && <p className={styles.feedback}>{saved.validation.message}</p>}{submitted && <p>복습 작품을 저장했어요.</p>}{saved?.submission && !submitted && <p className={styles.muted}>이전 제출본은 보존되어 있어요. 현재 작품을 다시 검증해 제출할 수 있어요.</p>}{work.review && <p className={styles.muted}>{work.review.status === "pending" ? "선생님 확인 대기 중이에요. 요청본을 유지하며 수정본을 계속 편집할 수 있어요." : work.review.message}</p>}</div></section>;
}
