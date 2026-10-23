"use client";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { StudentBadgesView } from "@/components/student/badges-view";
export default function BadgesPage() {
  const { session } = useSession();
  return <AppShell title="내 배지">{session?.role === "student" && !session.mustChangePassword && <StudentBadgesView key={session.uid} />}</AppShell>;
}
