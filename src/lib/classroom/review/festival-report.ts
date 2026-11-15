import type { FestivalProject } from "./project";
// The game's own chapter files hold the question titles, so the site does not retype them.
import ch1 from "../../../../teaching-materials/festival-romance/src/chapters/ch1.cjs";
import ch2 from "../../../../teaching-materials/festival-romance/src/chapters/ch2.cjs";
import ch3 from "../../../../teaching-materials/festival-romance/src/chapters/ch3.cjs";

type Chapter = { scenes: { questionId?: string; title: string }[] };
// Questions in the order the game asks them: [questionId, title].
const questions = ([ch1, ch2, ch3] as Chapter[]).map(chapter => chapter.scenes.flatMap(scene => scene.questionId ? [[scene.questionId, scene.title] as const] : []));
const endings = { some: "썸 시작", friend: "찐친", awkward: "어색한 사이" };

// What a teacher sees of a festival run (D5): hearts, ending and first-try misses; the cold choice stays hidden.
export function festivalReport(project: FestivalProject) {
  const ids = [1, 2, 3] as const;
  return {
    chapters: ids.map(id => ({ id, hearts: project.chapterResults[id].hearts })),
    total: project.totalHearts, max: project.maxHearts,
    ending: project.endingOutcome ? endings[project.endingOutcome] : "아직 엔딩 전",
    missed: ids.flatMap(id => questions[id - 1].filter(([questionId]) => project.chapterResults[id].questions[questionId]?.firstAttempt === false).map(([, title]) => title)),
  };
}
