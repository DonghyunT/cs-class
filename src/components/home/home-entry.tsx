"use client";

import Link from "next/link";
import { useId } from "react";
import { ArrowRight, BookOpen, GraduationCap, Pause, Play } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { useSession } from "@/components/session-provider";
import { LoadingSpinner } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HomeEntry({
  paused,
  onToggleMotion,
}: {
  paused: boolean;
  onToggleMotion: () => void;
}) {
  const { session, loading } = useSession();
  const entryHref = session?.role === "student"
    ? session.mustChangePassword ? "/login/student" : "/student"
    : session ? "/teacher" : null;
  const motionLabel = paused ? "움직임 켜기" : "움직임 줄이기";
  const motionTooltipId = useId();
  return (
    <div className="landing-header-actions">
      <Tooltip.Root>
        <Tooltip.Trigger
          className="landing-motion-control"
          delay={300}
          aria-label={motionLabel}
          aria-describedby={motionTooltipId}
          aria-pressed={!paused}
          onClick={onToggleMotion}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner
            side="bottom"
            sideOffset={8}
            className="landing-tooltip-positioner"
          >
            <Tooltip.Popup
              className="landing-tooltip"
              role="tooltip"
              id={motionTooltipId}
            >
              {motionLabel}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      {entryHref ? (
        <Link href={entryHref} className="landing-button compact">
          교실 입장 <ArrowRight size={16} />
        </Link>
      ) : (
        <Dialog>
          <DialogTrigger
            className="landing-button compact"
            disabled={loading}
            aria-busy={loading}
            aria-label="교실 입장"
          >
            {loading ? <>입장 준비 중 <LoadingSpinner /></> : <>교실 입장 <ArrowRight size={16} /></>}
          </DialogTrigger>
          <DialogContent className="entry-dialog">
            <DialogHeader>
              <DialogTitle>어떤 공간으로 갈까요?</DialogTitle>
              <DialogDescription>
                나에게 맞는 공간을 선택해 주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="entry-choices">
              <Link
                href="/login/student"
                className="entry-choice student"
                aria-label="학생으로 입장"
              >
                <span className="entry-choice-icon">
                  <BookOpen size={25} strokeWidth={1.6} />
                </span>
                <span>
                  <strong>학생으로 입장</strong>
                  <span>안내받은 학번과 비밀번호로</span>
                </span>
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/login/teacher"
                className="entry-choice teacher"
                aria-label="선생님으로 입장"
              >
                <span className="entry-choice-icon">
                  <GraduationCap size={27} strokeWidth={1.6} />
                </span>
                <span>
                  <strong>선생님으로 입장</strong>
                  <span>교사·강사 계정으로</span>
                </span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
