const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseEvaluationBank, gradeAssignment, teacherReview, publicAssignment } = require('../server/evaluation-bank.cjs');
const { validateExpansion, compareStudent, buildPlan, currentPatch, digest } = require('../server/objective-regrade.cjs');
const { applyPlan, restorePlan } = require('../tools/apply-objective-regrade.cjs');
const { fields, decode, root, name } = require('../tools/firebase-admin.cjs');
const { sourceKey, get } = require('../js/core/objective-correction.js');

test('p1_d2_09 in eval_bank_v4.json accepts both option 1 (2번) and option 3 (4번) as correct', () => {
  const bankPath = path.resolve(__dirname, '../scratch/eval_bank_v4.json');
  let q;
  if (fs.existsSync(bankPath)) {
    const raw = fs.readFileSync(bankPath, 'utf8');
    const bank = parseEvaluationBank(raw);
    q = bank.part1.find(x => x.id === 'p1_d2_09');

    assert.ok(q, 'p1_d2_09 must exist in bank');
    assert.equal(q.correctAnswer, 3, 'Default correctAnswer is 3');
    assert.deepEqual(q.correctAnswers, [1, 3], 'Accepted answers are 1 and 3');
    assert.ok(q.teacherNote.includes('복수 정답 인정'), 'Teacher note explains multiple answers');
  } else {
    // CI or environment without local private question bank
    q = {
      id: 'p1_d2_09',
      title: '알고리즘 5대 조건을 모두 만족하는 집합 선별',
      desc: '문항 설명',
      teacherNote: '복수 정답 인정: 2번과 4번 복수 정답',
      difficulty: 'hard',
      subType: 'scenario',
      points: 3,
      options: ['1번', '2번', '3번', '4번'],
      correctAnswer: 3,
      correctAnswers: [1, 3]
    };
  }

  // Test grading
  const res1 = gradeAssignment({ part1: [q], part2: [] }, { part1: { p1_d2_09: 1 } });
  assert.equal(res1.part1, 3, 'Option 1 (2번) receives 3 points');

  const res3 = gradeAssignment({ part1: [q], part2: [] }, { part1: { p1_d2_09: 3 } });
  assert.equal(res3.part1, 3, 'Option 3 (4번) receives 3 points');

  const res0 = gradeAssignment({ part1: [q], part2: [] }, { part1: { p1_d2_09: 0 } });
  assert.equal(res0.part1, 0, 'Option 0 (1번) receives 0 points');

  const res2 = gradeAssignment({ part1: [q], part2: [] }, { part1: { p1_d2_09: 2 } });
  assert.equal(res2.part1, 0, 'Option 2 (3번) receives 0 points');

  // Test teacherReview
  const tReview1 = teacherReview({ part1: [q], part2: [] }, { part1: { p1_d2_09: 1 } });
  assert.equal(tReview1.part1[0].isCorrect, true);
  assert.equal(tReview1.part1[0].score, 3);
  assert.deepEqual(tReview1.part1[0].correctAnswers, [1, 3]);

  // Test publicAssignment never exposes answers
  const pub = publicAssignment({ part1: [q], part2: [] });
  assert.equal(pub.part1[0].correctAnswer, undefined);
  assert.equal(pub.part1[0].correctAnswers, undefined);
  assert.ok(!JSON.stringify(pub).includes('correctAnswer'));
});

test('objective-regrade handles Part 1 multiple choice answer expansion, plan building, applying and restoring', async () => {
  // Before bank: only answer 3 was correct for p1_d2_09
  const beforeBank = {
    version: 4,
    part1: [{
      id: 'p1_d2_09',
      title: '알고리즘 5대 조건을 모두 만족하는 집합 선별',
      desc: '다음 중...',
      teacherNote: '기존 출제 의도',
      difficulty: 'hard',
      subType: 'scenario',
      points: 3,
      options: ['1번', '2번', '3번', '4번'],
      correctAnswer: 3
    }],
    part2: [{
      id: 'sample_p2',
      title: '단답형',
      desc: '설명',
      teacherNote: '메모',
      difficulty: 'easy',
      subType: 'term',
      points: 5,
      placeholder: '입력',
      answers: ['정답']
    }]
  };

  // After bank: both 1 and 3 are correct
  const afterBank = structuredClone(beforeBank);
  afterBank.part1[0].correctAnswers = [1, 3];
  afterBank.part1[0].teacherNote = '복수 정답 인정';

  validateExpansion(beforeBank, afterBank);

  // Student who answered option 1 (2번) originally got 0 points
  const session = { name: name('classrooms/2-1'), updateTime: 'round-init', data: { status: 'ended', questionVersion: 4, attemptId: 'att-1' } };
  const student = {
    name: name('classrooms/2-1/students/02'),
    updateTime: 'stud-init',
    data: {
      status: 'submitted',
      attemptId: 'att-1',
      submittedAt: '2026-09-20T10:00:00Z',
      answers: { part1: { p1_d2_09: 1 }, part2: { sample_p2: '정답' } },
      scores: { part1: 0, part2: 5, objectiveTotal: 5 }
    }
  };

  const snapshot = { project: 'donghyun-algo', rounds: [{ classId: '2-1', archiveId: null, session, students: [student] }] };
  const plan = buildPlan(beforeBank, afterBank, snapshot, 'v4-p1-regrade-test');

  assert.equal(plan.summary.changedRecords, 1);
  assert.equal(plan.summary.changedAnswers, 1);
  const row = plan.groups[0].students[0];
  assert.equal(row.beforePart1, 0);
  assert.equal(row.afterPart1, 3);
  assert.equal(row.delta, 3);

  // Test currentPatch
  const patch = currentPatch(student.data, { afterPart1: 3, afterPart2: 5 });
  assert.equal(patch.scores.part1, 3);
  assert.equal(patch.scores.part2, 5);
  assert.equal(patch.scores.objectiveTotal, 8);

  // Test applyPlan and restorePlan in mock store
  const docs = new Map([
    [session.name, { name: session.name, updateTime: session.updateTime, fields: fields(session.data) }],
    [student.name, { name: student.name, updateTime: student.updateTime, fields: fields(student.data) }]
  ]);
  let seq = 0;
  const store = {
    docs,
    request: async (url, options = {}) => {
      if (url.endsWith(':beginTransaction')) return { transaction: 'tx' };
      if (url.endsWith(':batchGet')) return options.body.documents.map(k => docs.has(k) ? { found: structuredClone(docs.get(k)) } : { missing: k });
      if (url.endsWith(':rollback')) return {};
      if (url.endsWith(':commit')) {
        for (const w of options.body.writes) {
          const old = docs.get(w.update.name);
          const data = structuredClone(old?.fields || {});
          if (w.updateMask) {
            for (const key of w.updateMask.fieldPaths) {
              if (Object.hasOwn(w.update.fields, key)) data[key] = w.update.fields[key];
              else delete data[key];
            }
          } else Object.assign(data, w.update.fields);
          docs.set(w.update.name, { name: w.update.name, fields: data, updateTime: 'v-' + (++seq) });
        }
        return { commitTime: 'committed' };
      }
      const key = url.replace('https://firestore.googleapis.com/v1/', '');
      if (!docs.has(key)) throw Error('404 NOT_FOUND');
      return structuredClone(docs.get(key));
    },
    root,
    fields
  };

  await applyPlan(plan, store, plan.planHash);
  const updatedDoc = decode({ mapValue: { fields: docs.get(student.name).fields } });
  assert.equal(updatedDoc.scores.part1, 3);
  assert.equal(updatedDoc.scores.objectiveTotal, 8);
  assert.equal(get(updatedDoc).delta, 3);

  // Restore
  await restorePlan(plan, store, plan.planHash);
  const restoredDoc = decode({ mapValue: { fields: docs.get(student.name).fields } });
  assert.equal(restoredDoc.scores.part1, 0);
  assert.equal(restoredDoc.scores.objectiveTotal, 5);
  assert.equal(restoredDoc.objectiveCorrection, undefined);
});
