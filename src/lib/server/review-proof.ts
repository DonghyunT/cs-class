import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SandwichProject } from "../classroom/review/project";
import { requireCondition } from "./errors";
type Command = SandwichProject["commands"][number];
function key() {
  if (process.env.FIREBASE_PROJECT_ID === "demo-cs-class" && process.env.FIRESTORE_EMULATOR_HOST) return "demo-only-command-proof";
  requireCondition(process.env.CS_AI_COMMAND_SECRET && process.env.CS_AI_COMMAND_SECRET.length >= 32, 503, "AI_NOT_CONFIGURED", "AI 명령 연결을 준비하고 있어요. 입력은 보존됩니다.");
  return process.env.CS_AI_COMMAND_SECRET;
}
export function commandProof(uid: string, runId: string, command: Omit<Command, "proof">) {
  return createHmac("sha256", key()).update(JSON.stringify([uid, runId, command.id, command.text, command.actions, command.source])).digest("hex");
}
export function verifyCommands(uid: string, project: SandwichProject) {
  const ids = new Set<string>();
  for (const command of project.commands) {
    const expected = commandProof(uid, project.runId, command);
    requireCondition(!ids.has(command.id) && /^[a-f0-9]{64}$/.test(command.proof) && timingSafeEqual(Buffer.from(expected), Buffer.from(command.proof)), 400, "INVALID_COMMAND", "명령의 해석 기록이 일치하지 않아요. 현재 입력을 보관하고 기록을 다시 확인해 주세요.");
    ids.add(command.id);
  }
}
