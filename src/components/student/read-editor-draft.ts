import type { Lesson, WorkDraft } from "@/lib/classroom/types";
import { parseEntryProject } from "@/lib/classroom/entry-project";
import { parseProgrammingProject } from "@/lib/classroom/programming-entry";

export async function readEntryDraft(lesson: Lesson, current: WorkDraft, exportProject: () => Promise<string | null>): Promise<WorkDraft> {
  const serialized = await exportProject();
  const project = lesson.practice.type === "programming" ? parseProgrammingProject(serialized) : parseEntryProject(serialized);
  if (!serialized || !project) throw new Error("작품을 확인하지 못했어요. 블록과 입력값을 확인하고 다시 시도해 주세요.");
  if (lesson.practice.type === "programming" && current.programming) {
    // Other missions may still hold the raw Entry export from earlier edits; send every
    // mission normalized so the request stays within the server's per-project limits.
    const projects = Object.fromEntries(Object.entries(current.programming.projects).map(([id, raw]) => {
      const parsed = parseProgrammingProject(raw);
      return [id, parsed ? JSON.stringify(parsed.project) : raw];
    }));
    return { ...current, programming: { ...current.programming, projects: { ...projects, [current.programming.mission]: JSON.stringify(project.project) } } };
  }
  return { ...current, entryProject: serialized, practiceOrder: project.order };
}
