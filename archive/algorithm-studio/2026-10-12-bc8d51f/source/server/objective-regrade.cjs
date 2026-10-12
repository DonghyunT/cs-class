const crypto=require('node:crypto');
const {parseEvaluationBank,gradeAssignment}=require('./evaluation-bank.cjs');
const {sourceKey}=require('../js/core/objective-correction.js');
const stable=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const digest=value=>crypto.createHash('sha256').update(stable(value)).digest('hex');
const norm=value=>value.toLocaleLowerCase('ko-KR').replace(/\s+/g,'').trim();
function validateExpansion(before,after){
  parseEvaluationBank(JSON.stringify(before));parseEvaluationBank(JSON.stringify(after));
  if(before.part1.length!==after.part1.length||before.part2.length!==after.part2.length)throw Error('BANK_CONTENT_CHANGED');
  before.part1.forEach((q,index)=>{
    const candidate=after.part1[index];
    const {correctAnswer,correctAnswers,teacherNote,...rest}=q;
    const {correctAnswer:nextSingle,correctAnswers:nextMulti,teacherNote:nextNote,...nextRest}=candidate;
    if(stable(rest)!==stable(nextRest))throw Error('NOT_ANSWER_EXPANSION');
    const oldAccepted=Array.isArray(correctAnswers)?correctAnswers:(Number.isInteger(correctAnswer)?[correctAnswer]:[]);
    const newAccepted=Array.isArray(nextMulti)?nextMulti:(Number.isInteger(nextSingle)?[nextSingle]:[]);
    if(!oldAccepted.every(a=>newAccepted.includes(a)))throw Error('NOT_ANSWER_EXPANSION');
  });
  before.part2.forEach((q,index)=>{
    const candidate=after.part2[index],{answers,...rest}=q,{answers:accepted,...next}=candidate;
    if(stable(rest)!==stable(next)||!answers.every(a=>accepted.some(b=>norm(a)===norm(b))))throw Error('NOT_ANSWER_EXPANSION');
  });
}
function compareStudent(before,after,session,student){
  if(session?.questionVersion!==4||session.status!=='ended'||!session.attemptId)return {skip:'ROUND_NOT_ENDED_V4'};
  if(student?.status!=='submitted')return {skip:'NOT_SUBMITTED'};
  if(student.attemptId!==session.attemptId)return {issue:'ROUND_MISMATCH'};
  const answersP1=student.answers?.part1||{};
  const answersP2=student.answers?.part2||{};
  if(typeof answersP1!=='object'||Array.isArray(answersP1))return {issue:'INVALID_ANSWERS'};
  if(typeof answersP2!=='object'||Array.isArray(answersP2))return {issue:'INVALID_ANSWERS'};
  const p1Ids=Object.keys(answersP1);
  const p2Ids=Object.keys(answersP2);
  if(p1Ids.length>10||p1Ids.some(id=>!before.part1.some(q=>q.id===id)))return {issue:'UNKNOWN_QUESTION_OR_ANSWER'};
  if(p2Ids.length>6||p2Ids.some(id=>!before.part2.some(q=>q.id===id)||typeof answersP2[id]!=='string'))return {issue:'UNKNOWN_QUESTION_OR_ANSWER'};
  const originalP1=before.part1.filter(q=>p1Ids.includes(q.id)),updatedP1=after.part1.filter(q=>p1Ids.includes(q.id));
  const originalP2=before.part2.filter(q=>p2Ids.includes(q.id)),updatedP2=after.part2.filter(q=>p2Ids.includes(q.id));
  const p2Domains=originalP2.map(q=>q.domain).filter(Boolean);
  if(new Set(p2Domains).size!==p2Domains.length)return {issue:'DUPLICATE_DOMAIN'};
  const beforePart1=gradeAssignment({part1:originalP1,part2:[]},student.answers).part1;
  const afterPart1=gradeAssignment({part1:updatedP1,part2:[]},student.answers).part1;
  const beforePart2=gradeAssignment({part1:[],part2:originalP2},student.answers).part2;
  const afterPart2=gradeAssignment({part1:[],part2:updatedP2},student.answers).part2;
  const beforeTotal=beforePart1+beforePart2;
  const afterTotal=afterPart1+afterPart2;
  if(afterTotal===beforeTotal)return {unchanged:true};
  if(afterTotal<beforeTotal||afterPart1<beforePart1||afterPart2<beforePart2)throw Error('SCORE_DECREASE');
  // An existing persisted score may use another historical rubric. Do not replace it silently.
  if(student.scores?.part1!=null&&student.scores.part1!==beforePart1)return {issue:'STORED_SCORE_DIFFERS'};
  if(student.scores?.part2!=null&&student.scores.part2!==beforePart2)return {issue:'STORED_SCORE_DIFFERS'};
  if(student.scores?.teacherOverride!=null||Number.isFinite(student.scores?.total))return {issue:'CONFIRMED_TOTAL_REQUIRES_REVIEW'};
  const changes=[];
  if(afterPart1>beforePart1){
    updatedP1.forEach(q=>{
      const old=originalP1.find(row=>row.id===q.id);
      const was=gradeAssignment({part1:[old],part2:[]},student.answers).part1;
      const now=gradeAssignment({part1:[q],part2:[]},student.answers).part1;
      if(now>was)changes.push({questionId:q.id,studentAnswer:answersP1[q.id],before:was,after:now,reason:'승인된 복수 정답 인정'});
    });
  }
  if(afterPart2>beforePart2){
    updatedP2.forEach(q=>{
      const old=originalP2.find(row=>row.id===q.id);
      const was=gradeAssignment({part1:[],part2:[old]},student.answers).part2;
      const now=gradeAssignment({part1:[],part2:[q]},student.answers).part2;
      if(now>was)changes.push({questionId:q.id,studentAnswer:answersP2[q.id],before:was,after:now,reason:'승인된 동등 표현 인정'});
    });
  }
  return {beforePart1,afterPart1,beforePart2,afterPart2,delta:afterTotal-beforeTotal,changes,sourceKey:sourceKey(student)};
}
function buildPlan(before,after,snapshot,revision){
  if(!/^v4-[a-z0-9-]{3,60}$/.test(revision))throw Error('INVALID_REVISION');
  if(snapshot.project!=='donghyun-algo')throw Error('WRONG_PROJECT');
  validateExpansion(before,after);
  const groups=[],issues=[],summary={rounds:snapshot.rounds.length,records:0,changedRecords:0,changedAnswers:0,currentChanged:0,archivedChanged:0,unchanged:0,skipped:0,perClass:{}};
  for(const round of snapshot.rounds){
    const session=round.archiveId?round.session.data.session:round.session.data;
    const expectedSessionPath=`projects/donghyun-algo/databases/(default)/documents/classrooms/${round.classId}`+(round.archiveId?`/archives/${round.archiveId}`:'');
    if(!/^2-(?:[1-9]|10|11)$/.test(round.classId)||round.session.name!==expectedSessionPath)throw Error('INVALID_SOURCE_PATH');
    const students=[];
    for(const saved of round.students){
      summary.records++;
      if(!new RegExp('^'+expectedSessionPath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/students/(0[1-9]|1[0-9]|2[0-7])$').test(saved.name))throw Error('INVALID_STUDENT_PATH');
      const result=compareStudent(before,after,session,saved.data);
      if(result.issue){issues.push({source:saved.name,reason:result.issue});continue;}
      if(result.skip){summary.skipped++;continue;}
      if(result.unchanged){summary.unchanged++;continue;}
      students.push({source:saved,...result});summary.changedRecords++;summary.changedAnswers+=result.changes.length;summary[round.archiveId?'archivedChanged':'currentChanged']++;
      summary.perClass[round.classId]=(summary.perClass[round.classId]||0)+1;
    }
    if(students.length)groups.push({classId:round.classId,archiveId:round.archiveId,session:round.session,attemptId:session.attemptId,auditId:'objective-'+revision+'-'+digest({path:round.session.name,attemptId:session.attemptId}).slice(0,24),students});
  }
  const plan={schemaVersion:1,revision,project:snapshot.project,beforeBankHash:digest(before),afterBankHash:digest(after),summary,issues,groups};
  return {...plan,planHash:digest(plan)};
}
function currentPatch(student,correction){
  // Only the objective subtotal changes. In particular review.confirmed and Part 3 stay untouched.
  const scores={...(student.scores||{})};
  if(Number.isFinite(correction.afterPart1))scores.part1=correction.afterPart1;
  if(Number.isFinite(correction.afterPart2))scores.part2=correction.afterPart2;
  if(Number.isFinite(scores.part1)&&Number.isFinite(scores.part2))scores.objectiveTotal=scores.part1+scores.part2;
  // Do not manufacture a final total from AI proposals or missing objective scores.
  return {scores,objectiveCorrection:correction};
}
module.exports={digest,validateExpansion,compareStudent,buildPlan,currentPatch};
