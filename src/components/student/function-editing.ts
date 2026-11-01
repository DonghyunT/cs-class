// While Entry's function editor is open the work cannot be read. Saving, checking and moving wait
// instead of failing: callers stop quietly and keep the editor as it is.
export const FUNCTION_EDITING_MESSAGE = "함수 편집 창에서 ‘저장’이나 ‘취소’를 먼저 눌러 주세요.";
export class FunctionEditingError extends Error {
  constructor() { super(FUNCTION_EDITING_MESSAGE); this.name = "FunctionEditingError"; }
}
