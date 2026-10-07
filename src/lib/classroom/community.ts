import type { Role } from "./types";

export interface QuestionAuthor {
  uid: string;
  role: Role;
  studentId: string | null;
  nickname: string | null;
}
export interface QuestionAnswer {
  id: string;
  body: string;
  author: QuestionAuthor;
  createdAt: number;
}
export interface QuestionSummary {
  id: string;
  classId: string;
  title: string;
  lessonId: string | null;
  author: QuestionAuthor;
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  resolvedAt: number | null;
  resolvedBy: QuestionAuthor | null;
  answerCount: number;
}
export interface CommunityQuestion extends QuestionSummary {
  body: string;
  answers: QuestionAnswer[];
}
export interface CommunityData {
  classroom: { id: string; name: string };
  classrooms: { id: string; name: string }[];
  lessons: { id: string; title: string }[];
  questions: QuestionSummary[];
  nextCursor: string | null;
}
export interface QuestionReplyResult { question: QuestionSummary; answer: QuestionAnswer }
export const QUESTION_ANSWER_LIMIT = 40;

export function questionAuthorName(author: QuestionAuthor) {
  return author.nickname ?? (author.role === "student" ? `${author.studentId} 학생` : author.role === "instructor" ? "강사" : "선생님");
}
