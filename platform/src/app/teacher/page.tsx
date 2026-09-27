"use client";
import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Layers3,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LessonArt } from "@/components/visuals";
import {
  allowedClasses,
  DEMO_PASSWORD,
  lessons,
  studentIds,
  type ClassState,
  type LessonId,
} from "@/lib/demo-data";

export default function TeacherHome() {
  const { session, classes, accounts, visited, updateClass } = useDemo();
  const allowed = allowedClasses(session?.role ?? "student");
  const [selected, setSelected] = useState(1);
  const classId = allowed.includes(selected) ? selected : (allowed[0] ?? 1);
  const state = classes[classId];
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<ClassState>(state);
  const current = lessons.find((item) => item.id === state.current);
  const ids = studentIds(classId);
  const filtered = ids.filter((id) => id.includes(search.trim()));
  const seen = ids.filter((id) => (visited[id] ?? []).length > 0).length;
  function chooseClass(id: number) {
    setSelected(id);
    setSearch("");
    setNotice("");
  }
  function toggleLesson(id: LessonId) {
    setDraft((previous) => ({
      current:
        previous.current === id && previous.opened.includes(id)
          ? null
          : previous.current,
      opened: previous.opened.includes(id)
        ? previous.opened.filter((item) => item !== id)
        : [...previous.opened, id],
    }));
  }
  return (
    <AppShell title="우리 반 관리" teacher>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A GOOD DAY TO DISCOVER</span>
          <h1>오늘의 교실을 살펴볼까요?</h1>
          <p>수업을 열고, 학생들의 작은 시작을 함께해 주세요.</p>
        </div>
        <span className="staff-badge">
          <ShieldCheck size={16} />
          {session?.role === "instructor"
            ? "강사 · 10·11반 담당"
            : "관리자 · 전체 반"}
        </span>
      </div>
      <div className="class-switcher" aria-label="관리할 반 선택">
        {allowed.map((id) => (
          <Button
            key={id}
            variant="ghost"
            aria-pressed={classId === id}
            className={classId === id ? "selected" : ""}
            onClick={() => chooseClass(id)}
          >
            {id}반
          </Button>
        ))}
      </div>
      <div className="class-section-heading">
        <h2>
          2학년 {classId}반 <span>우리 반 한눈에 보기</span>
        </h2>
        <span className="quiet-label">가상 명단 · 화면 체험</span>
      </div>
      <div className="stats-grid">
        <Card className="stat-card">
          <span className="stat-icon">
            <Users size={21} />
          </span>
          <div>
            <span>우리 반 학생</span>
            <strong>
              27 <small>명</small>
            </strong>
          </div>
        </Card>
        <Card className="stat-card">
          <span className="stat-icon">
            <BookOpen size={21} />
          </span>
          <div>
            <span>열린 수업</span>
            <strong>
              {state.opened.length} <small>개</small>
            </strong>
          </div>
        </Card>
        <Card className="stat-card">
          <span className="stat-icon">
            <GraduationCap size={23} />
          </span>
          <div>
            <span>수업을 둘러본 학생</span>
            <strong>
              {seen} <small>명</small>
            </strong>
          </div>
        </Card>
      </div>
      <Card className="teacher-current">
        <div className="teacher-current-art">
          <LessonArt kind={current?.id ?? "flow"} />
        </div>
        <div className="teacher-current-copy">
          <span className="eyebrow">우리 반의 이번 수업</span>
          <h2>{current?.title ?? "아직 지정된 수업이 없습니다."}</h2>
          <p>
            {current
              ? "학생이 입장하면 이 수업을 가장 먼저 만납니다."
              : "수업을 열고 이번 수업으로 지정해 보세요."}
          </p>
        </div>
        <Dialog
          open={manageOpen}
          onOpenChange={(open) => {
            if (open) setDraft({ ...state, opened: [...state.opened] });
            setManageOpen(open);
          }}
        >
          <DialogTrigger render={<Button variant="outline" />}>
            <Settings2 size={16} /> 수업 관리
          </DialogTrigger>
          <DialogContent className="lesson-dialog">
            <DialogHeader>
              <DialogTitle>2학년 {classId}반 수업 관리</DialogTitle>
              <DialogDescription>
                열린 수업은 학생이 자유롭게 복습할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="lesson-options">
              {lessons.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={draft.opened.includes(item.id)}
                    onChange={() => toggleLesson(item.id)}
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.category} · 콘텐츠 준비 중</small>
                  </span>
                </label>
              ))}
            </div>
            <label className="field">
              이번 수업
              <select
                aria-label="이번 수업"
                value={draft.current ?? ""}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    current: event.target.value
                      ? (event.target.value as LessonId)
                      : null,
                  }))
                }
              >
                <option value="">지정하지 않음</option>
                {lessons
                  .filter((item) => draft.opened.includes(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <p className="dialog-note">
              변경은 이 화면 체험 안에서만 유지됩니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageOpen(false)}>
                취소
              </Button>
              <Button
                onClick={() => {
                  if (updateClass(classId, draft)) {
                    setNotice(`${classId}반 수업 설정을 시안에 반영했습니다.`);
                    setManageOpen(false);
                  }
                }}
              >
                설정 적용
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
      <div className="notice-slot" role="status" aria-live="polite">
        {notice && (
          <span>
            <CheckCircle2 size={17} />
            {notice}
          </span>
        )}
      </div>
      <section id="students" className="student-list-section">
        <div className="section-heading">
          <div>
            <h2>
              학생 목록 <span className="count-pill">27</span>
            </h2>
            <p>학생의 활동을 확인하고, 필요한 경우 비밀번호를 초기화하세요.</p>
          </div>
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label="학번 검색"
              placeholder="학번 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Card className="student-table-card">
          <div className="table-scroll">
            <table>
              <caption className="sr-only">2학년 {classId}반 학생 목록</caption>
              <thead>
                <tr>
                  <th scope="col">번호</th>
                  <th scope="col">학생</th>
                  <th scope="col">활동 상태</th>
                  <th scope="col">계정 상태</th>
                  <th scope="col">계정 관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((id) => (
                  <tr key={id}>
                    <td>{Number(id.slice(-2))}</td>
                    <td>
                      <span className="table-student">
                        <span className="table-avatar">{id.slice(-2)}</span>
                        <strong>{id}</strong>
                        <span className="desktop-label">학생</span>
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          (visited[id] ?? []).length
                            ? "status-chip active-status"
                            : "status-chip"
                        }
                      >
                        {(visited[id] ?? []).length
                          ? "둘러보기 시작"
                          : "활동 전"}
                      </span>
                    </td>
                    <td>
                      <span className="account-status">
                        {accounts[id] && !accounts[id].mustChange
                          ? "비밀번호 변경 완료"
                          : "첫 입장 시 변경"}
                      </span>
                    </td>
                    <td>
                      <ResetPassword
                        id={id}
                        onComplete={() =>
                          setNotice(
                            `${id} 학생의 시안 비밀번호를 초기화했습니다. 다음 입장 시 변경이 필요합니다.`,
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <div className="empty-search">
              <Search size={24} />
              <strong>일치하는 학번이 없습니다.</strong>
              <p>선택한 반의 학번을 확인해 주세요.</p>
              <Button variant="outline" onClick={() => setSearch("")}>
                검색 지우기
              </Button>
            </div>
          )}
          <div className="table-footer">
            <span>{filtered.length}명 표시 · 전체 27명</span>
            <span>학습 기록은 초기화되지 않습니다.</span>
          </div>
        </Card>
      </section>
      <div className="teacher-bottom-note">
        <Layers3 size={18} />
        <span>
          학생 명단은 사전 등록 방식입니다. 현재 표시된 학생은 가상
          데이터입니다.
        </span>
        <ChevronRight size={16} />
      </div>
    </AppShell>
  );
}
function ResetPassword({
  id,
  onComplete,
}: {
  id: string;
  onComplete: () => void;
}) {
  const { resetPassword } = useDemo();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="reset-button" />}
        aria-label={`${id} 비밀번호 초기화`}
      >
        <KeyRound size={15} />
        <span>초기화</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {id} 학생의 비밀번호를 초기화할까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            학습 기록은 그대로 유지합니다. 시안 비밀번호는 {DEMO_PASSWORD}로
            바뀌고, 학생은 다음 로그인에서 새 비밀번호를 설정해야 합니다. 실제
            계정은 변경되지 않습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (resetPassword(id)) {
                onComplete();
                setOpen(false);
              }
            }}
          >
            초기화하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
