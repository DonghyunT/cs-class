"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  allowedClasses,
  DEMO_PASSWORD,
  getClassId,
  initialClasses,
  type ClassState,
  type LessonId,
  type Session,
} from "@/lib/demo-data";

type Account = { password: string; mustChange: boolean };
type DemoContextValue = {
  session: Session | null;
  classes: Record<number, ClassState>;
  accounts: Record<string, Account>;
  visited: Record<string, LessonId[]>;
  loginStudent: (id: string, password: string) => string | null;
  loginStaff: (role: "teacher" | "instructor") => void;
  logout: () => void;
  changePassword: (password: string) => void;
  resetPassword: (id: string) => boolean;
  updateClass: (id: number, value: ClassState) => boolean;
  visitLesson: (id: LessonId) => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);

// A disposable UI simulation, not authentication. Nothing is persisted or sent to a server.
export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [classes, setClasses] = useState(initialClasses);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [visited, setVisited] = useState<Record<string, LessonId[]>>({});
  function loginStudent(id: string, password: string) {
    const classId = getClassId(id);
    const account = accounts[id] ?? {
      password: DEMO_PASSWORD,
      mustChange: true,
    };
    if (!classId || password !== account.password)
      return "학번과 시안 비밀번호를 다시 확인해 주세요.";
    setSession({
      role: "student",
      studentId: id,
      classId,
      mustChange: account.mustChange,
    });
    return null;
  }
  function changePassword(password: string) {
    if (!session?.studentId) return;
    setAccounts((previous) => ({
      ...previous,
      [session.studentId!]: { password, mustChange: false },
    }));
    setSession({ ...session, mustChange: false });
  }
  function resetPassword(id: string) {
    const classId = getClassId(id);
    if (!session || !classId || !allowedClasses(session.role).includes(classId))
      return false;
    setAccounts((previous) => ({
      ...previous,
      [id]: { password: DEMO_PASSWORD, mustChange: true },
    }));
    return true;
  }
  function updateClass(id: number, value: ClassState) {
    if (!session || !allowedClasses(session.role).includes(id)) return false;
    if (value.current && !value.opened.includes(value.current)) return false;
    setClasses((previous) => ({ ...previous, [id]: value }));
    return true;
  }
  function visitLesson(id: LessonId) {
    if (
      !session?.studentId ||
      session.mustChange ||
      !classes[session.classId!].opened.includes(id)
    )
      return;
    setVisited((previous) => ({
      ...previous,
      [session.studentId!]: [
        id,
        ...(previous[session.studentId!] ?? []).filter((value) => value !== id),
      ],
    }));
  }
  return (
    <DemoContext.Provider
      value={{
        session,
        classes,
        accounts,
        visited,
        loginStudent,
        loginStaff: (role) => setSession({ role }),
        logout: () => setSession(null),
        changePassword,
        resetPassword,
        updateClass,
        visitLesson,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is missing");
  return value;
}
