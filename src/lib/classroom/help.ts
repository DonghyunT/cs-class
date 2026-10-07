import type { Lesson, Stage, Work } from "./types";

export type HelpRequest = { id: string; uid: string; studentId: string; nickname?: string; classId: string; lessonId: string; stage: Stage; mission: string | null; requestedAt: number; revision: number; status: "pending" | "cancelled" | "resolved" };
export type HelpSnapshot = { request: HelpRequest; lesson: Lesson; work: Work; snapshotAt: number; latest: boolean };
