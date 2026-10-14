import { practiceMatches } from "@/lib/classroom/progress";
import { programmingProjectMatches } from "@/lib/classroom/programming-entry";
import { reviewProjectSchema, sameReviewProject } from "@/lib/classroom/review/project";
import type { Submission, ValidationResult, Work, WorkAction, WorkDraft } from "@/lib/classroom/types";

const sameDraft = (a: WorkDraft, b: WorkDraft) => JSON.stringify(a) === JSON.stringify(b);
const stringRecord = (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every(item => typeof item === "string");
export function hasRecoveryFields(value: Work): boolean {
  const draft = value.draft;
  const feedback = (record: Work["conceptFeedback"]) => !!record && typeof record === "object" && !Array.isArray(record) && Object.values(record).every(item => item && typeof item.correct === "boolean" && typeof item.message === "string");
  const ids = (items: string[]) => Array.isArray(items) && items.every(item => typeof item === "string");
  const project = (item: WorkDraft["reviewProject"]) => {
    if (item === undefined) return true;
    const checked = reviewProjectSchema.safeParse(item);
    // Work contains the schema's output shape. Reject missing defaulted fields rather than rewrite a draft.
    return checked.success && Object.keys(checked.data).every(key => Object.hasOwn(item, key));
  };
  const practice = (item: Submission | ValidationResult | null) => item === null || !!item && ids(item.order) && project(item.reviewProject) &&
    ("passed" in item ? typeof item.passed === "boolean" && typeof item.message === "string" : typeof item.id === "string" && Number.isFinite(item.submittedAt));
  return Number.isSafeInteger(value.revision) && value.revision >= 0 &&
    Number.isSafeInteger(value.quizRound) && typeof value.quizRoundGraded === "boolean" &&
    ids(value.conceptSolved) && ids(value.quizSolved) && ids(value.quizRoundIds) &&
    feedback(value.conceptFeedback) && feedback(value.quizFeedback) &&
    practice(value.validation) && practice(value.submission) &&
    (!value.missions || typeof value.missions === "object" && !Array.isArray(value.missions) &&
      Object.values(value.missions).every(item => item && practice(item.validation) && practice(item.submission))) &&
    (!value.review || !!value.review.project && project(value.review.project)) &&
    (!value.aiReview || !!value.aiReview.project && project(value.aiReview.project)) &&
    !!draft && ["concept", "quiz", "practice"].includes(draft.stage) &&
    stringRecord(draft.conceptAnswers) && stringRecord(draft.quizAnswers) && ids(draft.practiceOrder) &&
    project(draft.reviewProject) &&
    (!draft.programming || typeof draft.programming.mission === "string" &&
      typeof draft.programming.reflection === "string" && stringRecord(draft.programming.projects));
}

// Confirm an available result for the saved request, never infer non-execution from a GET.
export function hasActionResult(before: Work, action: WorkAction, next: Work): boolean {
  if (next.lessonId !== before.lessonId || next.revision < before.revision || next.revision > before.revision + 1) return false;
  const expected = structuredClone(before.draft);
  if (action.type === "retry-quiz") {
    const remaining = before.quizRoundIds.filter(id => !before.quizSolved.includes(id));
    for (const id of remaining) delete expected.quizAnswers[id];
    return sameDraft(expected, next.draft) && next.revision === before.revision + 1 &&
      next.quizRound === before.quizRound + 1 && !next.quizRoundGraded &&
      JSON.stringify(next.quizRoundIds) === JSON.stringify(remaining) &&
      JSON.stringify(next.quizSolved) === JSON.stringify(before.quizSolved) && remaining.every(id => !next.quizFeedback[id]);
  }
  if (!sameDraft(expected, next.draft)) return false;
  if (action.type === "grade-quiz") return next.revision === before.revision + 1 && next.quizRound === before.quizRound && next.quizRoundGraded &&
    JSON.stringify(next.quizRoundIds) === JSON.stringify(before.quizRoundIds) && before.quizRoundIds.every(id => next.quizFeedback[id]);
  if (action.type === "check-concept") return next.revision === before.revision + 1 && !!next.conceptFeedback[action.conceptId];
  if (action.type === "request-review") return next.revision === before.revision + 1 && !!next.review && next.review.id !== before.review?.id &&
    next.review.missionId === action.missionId && sameReviewProject(before.draft.reviewProject, next.review.project, action.missionId);
  const record = action.missionId ? next.missions?.[action.missionId] : next;
  const saved = action.type === "validate-practice" ? record?.validation : record?.submission;
  if (!saved || action.type === "validate-practice" && next.revision === before.revision) return false;
  return before.draft.programming && action.missionId ? programmingProjectMatches(before.draft.programming.projects[action.missionId], saved.entryProject) :
    before.draft.reviewProject ? sameReviewProject(before.draft.reviewProject, saved.reviewProject, action.missionId) : practiceMatches(before.draft, saved);
}
