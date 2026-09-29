import Link from "next/link";
import { GraduationCap } from "lucide-react";
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
