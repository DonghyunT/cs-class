import { z } from "zod";
import { flowCardSchema, flowchartSchema } from "./project";
import type { Work } from "../types";
export const aiTaskSchema = z.enum(["sandwich-command", "sandwich-rules", "abstraction-help", "abstraction-plan", "abstraction-chat", "abstraction-review", "flow-puzzle", "flow-plan", "flow-review"]);
export const flowDefinitionSchema = z.object({ goal: z.string().min(1).max(1000), conditions: z.array(z.string().min(1).max(1000)).min(1).max(20), core: z.array(z.string().min(1).max(1000)).min(1).max(20) }).strict();
export const aiResultSchema = z.object({ message: z.string().min(1).max(3000), options: z.array(z.string().max(1000)).max(10), actions: z.array(z.string().max(80)).max(30), cards: z.array(flowCardSchema).max(5), verdict: z.enum(["pass", "needs-changes", "uncertain"]), definition: flowDefinitionSchema.optional() }).strict();
export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiResult = z.infer<typeof aiResultSchema>;
export interface AiReply { result: AiResult; work: Work; reused: boolean; remaining: number; }
// Unadopted prescription fields are request context, never a second saved draft.
export const flowPlanningSchema = flowchartSchema.pick({ current: true, goal: true, conditions: true, core: true });
export type FlowPlanning = z.infer<typeof flowPlanningSchema>;
