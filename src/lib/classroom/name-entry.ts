import { buildEntryProject } from "./entry-project";

// The dog project every programming mission starts from: one object and a lone start block.
export function buildNameProject(): string {
  const project = JSON.parse(buildEntryProject()) as Record<string, unknown>;
  const object = (project.objects as Record<string, unknown>[])[0];
  object.name = "강아지";
  object.sprite = { sounds: [], pictures: [{ id: "dog1", name: "강아지", imageType: "svg", fileurl: "/entryjs/name-dog.svg", thumbUrl: "/entryjs/name-dog.svg", dimension: { width: 144, height: 144 } }] };
  object.selectedPictureId = "dog1";
  object.entity = { ...(object.entity as object), regX: 72, regY: 72, width: 144, height: 144, scaleX: 0.65, scaleY: 0.65 };
  object.script = [[{ type: "when_run_button_click", params: [null], id: "legacy0", x: 40, y: 140 }]];
  return JSON.stringify(project);
}
