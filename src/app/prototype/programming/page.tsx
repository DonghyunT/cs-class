import type { Metadata } from "next";
import { ProgrammingPrototype } from "@/components/prototype/programming/programming";

export const metadata: Metadata = { title: "강아지에게 말 걸기 · 수업 프로토타입 | CS Class" };

export default function Page() {
  return <ProgrammingPrototype />;
}
