export type Role = "student" | "teacher" | "instructor";
export type Stage = "concept" | "quiz" | "practice";
export type LearningStatus = "not-started" | "in-progress" | "completed";

export interface Session {
  uid: string;
  role: Role;
  studentId: string | null;
  classId: string | null;
  classIds: string[];
  mustChangePassword: boolean;
  lastActivityAt: number;
  idleTimeoutMs: number;
}
export interface ClassSettings {
  id: string;
  name: string;
  currentLessonId: string | null;
  openedLessonIds: string[];
  revision: number;
}
export interface Question {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  hint: string;
}
export type PracticeType = "ordering" | "entryjs";

export interface PracticeBlock {
  id: string;
  label: string;
}

export interface PracticeCriterion {
  id: string;
  label: string;
}

export interface PracticeDef {
  type?: PracticeType;
  title: string;
  description: string;
  blocks: PracticeBlock[];
  criteria?: PracticeCriterion[];
  defaultProject?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category?: string;
  concepts: { id: string; title: string; explanation: string; example: string; question: Question }[];
  quiz: Question[];
  practice: PracticeDef;
}
export interface WorkDraft {
  stage: Stage;
  conceptAnswers: Record<string, string>;
  quizAnswers: Record<string, string>;
  practiceOrder: string[];
  entryProject?: string | null;
}
export interface Feedback { correct: boolean; message: string }
export interface Submission {
  id: string;
  order: string[];
  entryProject?: string | null;
  submittedAt: number;
}
export interface ValidationResult {
  passed: boolean;
  message: string;
  order: string[];
  entryProject?: string | null;
  criteriaResults?: { id: string; passed: boolean; message: string }[];
}
export interface Work {
  lessonId: string;
  revision: number;
  draft: WorkDraft;
  conceptSolved: string[];
  conceptFeedback: Record<string, Feedback>;
  quizSolved: string[];
  quizRound: number;
  quizRoundIds: string[];
  quizRoundGraded: boolean;
  quizFeedback: Record<string, Feedback>;
  validation: ValidationResult | null;
  submission: Submission | null;
  updatedAt: number | null;
}
export interface Progress {
  concept: { completed: number; total: number; percent: number };
  quiz: { completed: number; total: number; percent: number };
  practice: { completed: number; total: number; percent: number };
  status: LearningStatus;
}
export interface StudentDashboard {
  classroom: ClassSettings;
  lessons: Lesson[];
  work: Record<string, Work>;
}
export interface StudentRow {
  uid: string;
  studentId: string;
  mustChangePassword: boolean;
  work: Work | null;
}
export interface TeacherDashboard {
  classrooms: ClassSettings[];
  lessons: Lesson[];
  classroom: ClassSettings;
  selectedLessonId: string | null;
  students: StudentRow[];
}
export type WorkAction =
  | { type: "check-concept"; conceptId: string }
  | { type: "grade-quiz" }
  | { type: "retry-quiz" }
  | { type: "validate-practice" }
  | { type: "submit-practice" };
