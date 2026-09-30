"use client";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { StudentDashboardView } from "@/components/student/dashboard";
export default function LessonsPage() {
  const { session } = useSession();
  return <AppShell title="열린 수업">{session?.role === "student" && !session.mustChangePassword && <StudentDashboardView key={session.uid} />}</AppShell>;
}
