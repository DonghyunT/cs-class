import { buildProgrammingProject, newAddedObject, type AddedObject, type EntryNode } from "../src/lib/classroom/programming-entry";

// Projects with objects added from the single-picture sprite list before shapes
// were supported. Their keys and normalized projects are frozen in
// fixtures/entry-legacy-objects.json so saved checks keep matching.
const node = (type: string, ...params: unknown[]): EntryNode => ({ type, params });
const start = () => node("when_run_button_click", null);
const object = (sprite: string, id: string, change: Partial<AddedObject> = {}): AddedObject => ({ ...newAddedObject(sprite, 0)!, id, ...change });

export const LEGACY_OBJECT_INPUTS: Record<string, string> = {
  ballBehindDog: buildProgrammingProject([[start(), node("move_direction", node("number", "10"), null)]], [object("ball", "obj-ball", { threads: [[start(), node("move_x", node("number", "30"), null)]] })], 1),
  treeAndStarInFront: buildProgrammingProject([[start()]], [object("tree", "obj-tree", { name: "큰 나무", entity: { x: -80, y: 20, scaleX: -0.8, scaleY: 0.8, rotation: 15, direction: 90, visible: true } }), object("star", "obj-star", { rotateMethod: "vertical" })], 0),
};
