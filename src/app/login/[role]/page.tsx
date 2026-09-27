import { notFound } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
export function generateStaticParams() {
  return [{ role: "student" }, { role: "teacher" }];
}
export default async function LoginPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (role !== "student" && role !== "teacher") notFound();
  return <LoginScreen role={role} />;
}
