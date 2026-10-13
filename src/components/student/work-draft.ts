import type { WorkDraft } from "@/lib/classroom/types";
import { buildProgrammingProject, parseProgrammingProject, programmingMissions } from "@/lib/classroom/programming-entry";
import { parseEntryProject } from "@/lib/classroom/entry-project";
const starter = buildProgrammingProject();

type ContentNode = { type: string; params: unknown[]; x?: number; y?: number };
function scriptContent(threads: ContentNode[][]) {
  const semantic = (node: { type: string; params: unknown[] }): unknown => ({ type: node.type, params: (node.params ?? [null]).map((value, index) => {
    if (value && typeof value === "object" && "type" in value && "params" in value) return semantic(value as { type: string; params: unknown[] });
    return index === 0 && ["number", "angle"].includes(node.type) ? String(value) : value;
  }) });
  // A thread's anchor is an authored layout; nested reporter coordinates and IDs are native metadata.
  return threads.map(thread => ({ x: thread[0]?.x ?? 50, y: thread[0]?.y ?? 30, blocks: thread.map(semantic) }));
}
function programmingContent(raw: string) {
  const parsed = parseProgrammingProject(raw);
  return parsed ? scriptContent(parsed.threads) : raw;
}
function entryContent(raw: string) {
  if (!parseEntryProject(raw)) return raw;
  const project = JSON.parse(raw);
  const script = project.objects[0].script;
  // Keep literal editing values, including "", rather than the execution parser's numeric coercion.
  return scriptContent(typeof script === "string" ? JSON.parse(script) : script);
}
const starterContent = programmingContent(starter);

function content(draft: WorkDraft) {
  const next: Record<string, unknown> = { ...draft }; delete next.stage;
  if (draft.entryProject) next.entryProject = entryContent(draft.entryProject);
  if (draft.programming) {
    const { projects, reflection } = draft.programming;
    // Visiting a mission or normalizing fixed Entry media is not an edit.
    next.programming = { reflection, projects: Object.fromEntries(programmingMissions.map(({ id }) => {
      const raw = projects[id] ?? (id === "keys" ? projects.move : undefined);
      return [id, raw ? programmingContent(raw) : starterContent];
    })) };
  }
  const project = draft.reviewProject;
  if (project?.type === "abstraction") {
    const answers: Record<string, unknown> = { ...project }; delete answers.step; delete answers.tutorialStep; delete answers.view;
    next.reviewProject = answers;
  } else if (project?.type === "flowchart") {
    const answers: Record<string, unknown> = { ...project }; delete answers.mission; delete answers.guideStep; delete answers.pan;
    next.reviewProject = answers;
  }
  return next;
}

export function sameWorkContent(a: WorkDraft, b: WorkDraft) {
  return JSON.stringify(content(a)) === JSON.stringify(content(b));
}
