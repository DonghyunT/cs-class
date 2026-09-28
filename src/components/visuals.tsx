import Link from "next/link";
import {
  GraduationCap,
  Database,
  Fingerprint,
  GitBranch,
} from "lucide-react";
import type { LessonId } from "@/lib/demo-data";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${small ? "brand-small" : ""}`}
      aria-label="CS Class 홈"
    >
      <span className="brand-symbol">
        <GraduationCap size={small ? 22 : 27} strokeWidth={2.1} />
      </span>
      <span>
        CS<span className="brand-light"> Class</span>
        <small>즐거운 정보 교실</small>
      </span>
    </Link>
  );
}
export function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="demo-dot" /> 수업 미리보기{" "}
      <span className="demo-separator">·</span> 이 화면의 예시는 학습 기록에
      저장되지 않아요.
    </div>
  );
}
export function LessonArt({ kind }: { kind: LessonId }) {
  if (kind === "flow")
    return (
      <div className="mini-flow" aria-hidden="true">
        <span className="mini-pill" />
        <i />
        <span className="mini-diamond" />
        <i />
        <div>
          <span />
          <span />
        </div>
        <GitBranch size={22} className="art-corner" />
      </div>
    );
  if (kind === "data")
    return (
      <div className="data-art" aria-hidden="true">
        <div className="data-bars">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <Database size={24} className="art-corner" />
        <div className="data-spark">✧</div>
      </div>
    );
  return (
    <div className="digital-art" aria-hidden="true">
      <div className="digital-orbit" />
      <div className="digital-orbit second" />
      <Fingerprint size={62} strokeWidth={1.3} />
      <span className="orbit-point" />
      <span className="orbit-point second" />
    </div>
  );
}
