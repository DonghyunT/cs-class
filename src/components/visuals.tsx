import Link from "next/link";
import {
  GraduationCap,
  Code2,
  Database,
  Fingerprint,
  GitBranch,
  Lightbulb,
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
      <span className="demo-dot" /> 화면 체험용 시안{" "}
      <span className="demo-separator">·</span> 실제 계정과 연결되지 않으며,
      새로고침하면 초기화됩니다.
    </div>
  );
}
export function FlowArt() {
  return (
    <div className="flow-art" aria-hidden="true">
      <div className="flow-window">
        <div className="window-bar">
          <span />
          <span />
          <span />
          <b>나의 첫 번째 아이디어</b>
          <Code2 size={16} />
        </div>
        <div className="flow-canvas">
          <div className="flow-node start-node">궁금한 생각</div>
          <div className="connector" />
          <div className="diamond">
            <Lightbulb size={28} />
          </div>
          <div className="branch-label yes">해 볼까?</div>
          <div className="branch-label no">다르게 생각!</div>
          <div className="branch-lines" />
          <div className="node-row">
            <div className="flow-node action-node">직접 해 보기</div>
            <div className="flow-node retry-node">다시 시도하기</div>
          </div>
          <div className="connector bottom-connector" />
          <div className="flow-node end-node">
            새로운 발견 <span>✦</span>
          </div>
        </div>
        <div className="window-status">
          <span /> 내 생각이 움직이는 중{" "}
          <span className="status-dots">•••</span>
        </div>
      </div>
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
