import type { WorkDraft } from "@/lib/classroom/types";
import { PROGRAMMING_MISSIONS, buildProgrammingProject, parseProgrammingProject } from "@/lib/classroom/programming-entry";
import { parseEntryProject } from "@/lib/classroom/entry-project";
const starter = buildProgrammingProject();

type ContentNode = { type: string; params: unknown[]; statements?: ContentNode[][]; x?: number; y?: number };
function scriptContent(threads: ContentNode[][]) {
  const semantic = (node: ContentNode): unknown => ({ type: node.type, params: (node.params ?? [null]).map((value, index) => {
    if (value && typeof value === "object" && "type" in value && "params" in value) return semantic(value as ContentNode);
    return index === 0 && ["number", "angle"].includes(node.type) ? String(value) : value;
  }), ...(node.statements?.length ? { statements: node.statements.map(thread => thread.map(semantic)) } : {}) });
  // A thread's anchor is an authored layout; nested reporter coordinates and IDs are native metadata.
  return threads.map(thread => ({ x: thread[0]?.x ?? 50, y: thread[0]?.y ?? 30, blocks: thread.map(semantic) }));
}
function programmingContent(raw: string) {
  const parsed = parseProgrammingProject(raw);
  if (!parsed) return raw;
  // Added objects' names, positions and code are edits too; dog-only projects keep their shape.
  return parsed.added.length ? { main: scriptContent(parsed.threads), mainIndex: parsed.mainIndex, added: parsed.added.map((o) => ({ ...o, threads: scriptContent(o.threads) })) } : scriptContent(parsed.threads);
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
    next.programming = { reflection, projects: Object.fromEntries(PROGRAMMING_MISSIONS.map(({ id, carryFrom }) => {
      const raw = projects[id] ?? (carryFrom ? projects[carryFrom] : undefined);
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
