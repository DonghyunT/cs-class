import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { initializeApp, applicationDefault, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { nextReviewSettings } from './lib/review-rollout.mjs';

const flags=new Map();
for(let i=2;i<process.argv.length;i+=2){ const name=process.argv[i],value=process.argv[i+1]; if(!['--mode','--phase','--output','--plan','--confirm-project'].includes(name)||!value||value.startsWith('--')||flags.has(name)) throw Error('Unknown, missing or repeated option.'); flags.set(name,value); }
const mode=flags.get('--mode')??'plan'; if(!['plan','apply','restore'].includes(mode)) throw Error('Use --mode plan|apply|restore.');
nextEnv.loadEnvConfig(process.cwd());
const projectId=process.env.FIREBASE_PROJECT_ID, emulator=projectId==='demo-cs-class'&&process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099'&&process.env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:8080';
if(process.env.VERCEL||(!emulator&&projectId!=='cs-class-f74c4')||(!emulator&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))) throw Error('Unexpected project or mixed emulator environment.');
if(mode!=='plan'&&flags.get('--confirm-project')!==projectId) throw Error('Confirm the actual project ID before changing settings.');
let service; if(!emulator&&process.env.FIREBASE_SERVICE_ACCOUNT_JSON){service=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);if(service.project_id!==projectId) throw Error('Service account project mismatch.');}
const app=initializeApp({projectId,...(emulator?{}:{credential:service?cert(service):applicationDefault()})}), db=getFirestore(app);
const ids=Array.from({length:11},(_,i)=>`2-${i+1}`), refs=ids.map(id=>db.collection('csClasses').doc(id));
const select=data=>{if(!data||!Array.isArray(data.openedLessonIds)||!Number.isSafeInteger(data.revision))throw Error('All 11 existing classes are required.');return {openedLessonIds:data.openedLessonIds,currentLessonId:data.currentLessonId??null,revision:data.revision};};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b), hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
if(mode==='plan'){
  const phase=flags.get('--phase'); const before=(await db.getAll(...refs)).map(s=>select(s.data()));
  const plan={version:1,projectId,phase,createdAt:new Date().toISOString(),classes:ids.map((id,i)=>({id,before:before[i],after:nextReviewSettings(before[i],phase)}))};
  const output=flags.get('--output'); if(!output) throw Error('Use --output for a private settings backup and plan.');
  await mkdir(path.dirname(path.resolve(output)),{recursive:true}); await writeFile(output,JSON.stringify({plan,sha256:hash(plan)},null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({mode,projectId,phase,output,classes:plan.classes}));
} else {
  if(!flags.get('--plan'))throw Error('Use the saved --plan file.'); const stored=JSON.parse(await readFile(flags.get('--plan'),'utf8')),plan=stored.plan;
  if(plan.version!==1||plan.projectId!==projectId||hash(plan)!==stored.sha256||!equal(plan.classes.map(c=>c.id),ids))throw Error('Plan project, hash or class identity mismatch.');
  for(const item of plan.classes) if(!equal(nextReviewSettings(item.before,plan.phase),item.after))throw Error('Invalid change plan.');
  const status=await db.runTransaction(async tx=>{
    const current=(await tx.getAll(...refs)).map(s=>select(s.data()));
    const expected=plan.classes.map(c=>mode==='apply'?c.before:c.after), next=plan.classes.map(c=>mode==='apply'?c.after:{...c.before,revision:c.after.revision+1});
    if(current.every((value,i)=>equal(value,next[i])))return 'already-completed';
    if(!current.every((value,i)=>equal(value,expected[i])))throw Error('Class settings changed after the plan. No settings were written.');
    refs.forEach((ref,i)=>tx.update(ref,next[i])); return 'completed';
  }); console.log(JSON.stringify({mode,projectId,phase:plan.phase,status,classes:11,artifactsPreserved:true}));
}
await deleteApp(app);
