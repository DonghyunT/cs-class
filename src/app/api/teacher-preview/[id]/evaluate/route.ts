import { authorizeTeacherPreview, evaluateTeacherPreview } from "@/lib/server/teacher-preview";
import { body, failure, json } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await authorizeTeacherPreview();
    const input = await body(request, 1024 * 1024);
    const { id } = await context.params;
    return json(await evaluateTeacherPreview(id, input));
  } catch (error) {
    return failure(error, { operation: "teacher-preview.evaluate" });
  }
}
