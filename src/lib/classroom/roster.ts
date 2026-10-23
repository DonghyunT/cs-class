// Each class's approved trial account uses number 99 (`2<class>99`, PRD §6.3); no real student has it.
export const isTrialStudentId = (studentId: string) => /^2(?:0[1-9]|1[01])99$/.test(studentId);
