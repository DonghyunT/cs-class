import type { Lesson, Stage, Work } from "./types";
import { findLesson } from "./catalog";
import { missionById } from "./programming-entry";
import { missions } from "./review/flowchart-data.mjs";

export type HelpRequest = { id: string; uid: string; studentId: string; nickname?: string; classId: string; lessonId: string; stage: Stage; mission: string | null; requestedAt: number; revision: number; status: "pending" | "cancelled" | "resolved" };
export type HelpSnapshot = { request: HelpRequest; lesson: Lesson; work: Work; snapshotAt: number; latest: boolean };

export function helpContextLabel(request: HelpRequest): string {
  const lesson = findLesson(request.lessonId);
  const stage = { concept: "개념", quiz: "퀴즈", practice: "실습" }[request.stage];
  const mission = request.stage !== "practice" || !request.mission ? null : lesson?.practice.type === "programming" ? missionById(request.mission)?.title : lesson?.practice.type === "flowchart" ? request.mission === "free" ? "자유 설계" : request.mission === "guide" ? "함께 만드는 예시 순서도" : missions.find(item => String(item.id) === request.mission)?.title : null;
  return `${lesson?.title ?? "수업 정보 확인 필요"} · ${stage}${mission ? ` · ${mission}` : ""}`;
}
