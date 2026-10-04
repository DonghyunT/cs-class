import { expect, test, type Page } from '@playwright/test';
import { LESSONS } from '../src/lib/classroom/catalog';
import { emptyWork } from '../src/lib/classroom/progress';
import { buildProgrammingProject } from '../src/lib/classroom/programming-entry';
import { seoulToday } from '../src/lib/classroom/planner';
import { db, localOnly, readyStudent, readyTeacher } from './emulator';
import type { StudentDashboard, TeacherDashboard } from '../src/lib/classroom/types';

async function choose(page: Page, label: string, choice: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await expect(page.getByRole('option', { name: choice, exact: true })).toBeVisible();
  await page.getByRole('option', { name: choice, exact: true }).click();
}

test('반은 메뉴·새로고침에서 유지하고 유효하지 않은 URL은 권한 오류로 처리', async ({ page }) => {
  await readyTeacher(page.request);
  await page.goto('/teacher/classes?classId=2-11');
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 11반');
  await page.getByRole('link', { name: '학생 현황·계정', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/students\?classId=2-11$/);
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 11반');
  await page.getByRole('link', { name: '대시보드', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\?classId=2-11$/);
  await expect(page.getByRole('heading', { name: '오늘은 무엇을 해볼까요?' })).toBeVisible();
  await expect(page.getByRole('region', { name: /이번 수업/ })).toContainText('2학년 11반');
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 11반');
  await choose(page, '담당 반', '2학년 5반');
  await expect(page).toHaveURL(/classId=2-5/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 5반');
  await page.getByRole('link', { name: '반 일정', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 5반');
  await page.goto('/teacher');
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 5반');
  await page.goto('/teacher/students?classId=2-99');
  await expect(page.getByRole('alert').filter({ hasText: '담당' })).toBeVisible();
  await page.getByRole('link', { name: '대시보드', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 5반');
});

test('새 로그인은 같은 교사도 기본 반으로 초기화하고 담당 범위 변경·계정 교체를 검증', async ({ page }) => {
  await localOnly(page.request);
  const profile = db.collection('csAccounts').doc('guest-teacher');
  const original = (await profile.get()).data()!.classIds;
  try {
    await profile.update({ classIds: ['2-10', '2-11'] });
    await page.goto('/login/teacher');
    await page.getByRole('button', { name: '게스트 교사', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 10반');
    await choose(page, '담당 반', '2학년 11반');
    await page.reload();
    await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 11반');
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await page.getByRole('button', { name: '게스트 교사', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 10반');
    await choose(page, '담당 반', '2학년 11반');
    await profile.update({ classIds: ['2-10'] });
    await page.goto('/teacher');
    await page.reload();
    await expect(page.getByRole('combobox', { name: '담당 반', exact: true })).toContainText('2학년 10반');
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await page.getByRole('button', { name: '게스트 학생', exact: true }).click();
    await expect(page).toHaveURL('http://localhost:3000/student');
    expect(await page.evaluate(() => sessionStorage.getItem('cs-teacher-class'))).toBeNull();
  } finally { await profile.update({ classIds: original }); }
});

test('학생 이번 수업 우선·구체적 이어갈 곳과 다음 일정 5개·나머지 수', async ({ page }, testInfo) => {
  await readyStudent(page.request);
  const programming = LESSONS.find((item) => item.id === 'programming-13')!;
  const work = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, emptyWork(lesson)]));
  work[programming.id].updatedAt = 1000;
  work[programming.id].draft.stage = 'practice';
  work[programming.id].draft.programming!.mission = 'multiply';
  work['sequence-lab'].updatedAt = 2000;
  work['sequence-lab'].draft.stage = 'quiz';
  await page.route('**/api/classroom/student', async (route) => {
    const response = await route.fetch();
    const data = await response.json() as StudentDashboard;
    await route.fulfill({ response, json: { ...data, classroom: { ...data.classroom, currentLessonId: programming.id, openedLessonIds: LESSONS.map((lesson) => lesson.id) }, lessons: LESSONS, work } });
  });
  await page.route('**/api/classroom/schedule?**', async (route) => {
    const response = await route.fetch(); const data = await response.json();
    await route.fulfill({ response, json: { ...data, items: Array.from({ length: 7 }, (_, i) => ({ id: `agenda-${i}`, title: `수업 준비 일정 ${i+1}`, date: seoulToday(), lessonId: null })), timetable: { ...data.timetable, items: [] } } });
  });
  await page.goto('/student');
  const agenda = page.getByRole('region', { name: '다가오는 일정', exact: true });
  await expect(agenda.locator('ul > li')).toHaveCount(5);
  await expect(agenda.getByRole('link', { name: '외 2개 · 전체 보기' })).toBeVisible();
  const actions = page.getByRole('region', { name: '수업에서 할 일', exact: true });
  await expect(actions.locator('li').first()).toContainText(programming.title);
  await expect(actions.locator('li').first()).toContainText('곱셈 계산기');
  await page.getByRole('link', { name: '열린 수업', exact: true }).click();
  const cards = page.locator('article');
  await expect(cards.first()).toContainText(programming.title);
  await expect(cards.first()).toContainText('이어갈 곳: 실습 · 곱셈 계산기');
  await expect(cards.nth(1)).toContainText(LESSONS.find((item) => item.id === 'sequence-lab')!.title);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('student-current-first-390.png'), fullPage: true });
});

test('교사 현재 반 업무가 개인 할 일보다 먼저이고 사람과 작품 개수를 구분', async ({ page }, testInfo) => {
  await readyTeacher(page.request);
  const lesson = LESSONS.find((item) => item.id === 'programming-13')!;
  const work = emptyWork(lesson); work.updatedAt = 1000;
  work.missions = Object.fromEntries(['name','multiply','average'].map((id) => [id, { validation: null, submission: { id, order: [], entryProject: buildProgrammingProject(), submittedAt: 1000 } }]));
  await page.route('**/api/classroom/teacher?**', async (route) => {
    const response = await route.fetch(); const data = await response.json() as TeacherDashboard;
    await route.fulfill({ response, json: { ...data, lessons: LESSONS, selectedLessonId: lesson.id, classroom: { ...data.classroom, currentLessonId: lesson.id }, students: [{ uid: 'ui-dashboard', studentId: '20188', mustChangePassword: false, work }] } });
  });
  await page.goto('/teacher');
  const actions = page.getByRole('region', { name: '교사가 확인할 일', exact: true });
  await expect(actions).toContainText('제출 학생 1명 · 저장된 제출 작품 3개');
  await expect(actions.getByRole('link', { name: /20188 제출 작품 보기/ })).toBeVisible();
  const todo = page.getByRole('region', { name: '내 할 일', exact: true });
  expect((await actions.boundingBox())!.y).toBeLessThan((await todo.boundingBox())!.y);
  await page.screenshot({ path: testInfo.outputPath('teacher-actions-first-1440.png'), fullPage: true });
});
