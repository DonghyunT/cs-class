/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const {chromium}=require(process.env.FESTIVAL_PLAYWRIGHT_MODULE||'@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=path.join(root,'qa-results');
fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.FESTIVAL_BROWSER?{executablePath:process.env.FESTIVAL_BROWSER}:{channel:'chrome'})});try{
 const checks=[],errors=[],remote=[];
 for(const motion of ['reduce','no-preference']){
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:motion});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.clock.install({time:new Date('2026-10-19T00:00:00Z')});
  await page.goto(pathToFileURL(path.join(root,'dist/festival-romance.html')).href);
  await page.clock.pauseAt(new Date('2026-10-19T00:01:00Z'));
  const jump=async id=>{await page.locator('#contents-button').click();await page.locator(`[data-scene="${id}"]`).click();};
  const enter=async(id,key)=>{await jump(id);for(let i=0;i<12;i++){if(await page.locator('#experiment').count())return;const choices=page.locator('[data-flow-choice]');if(await choices.count())await(key?page.locator(`[data-flow-choice="${key}"]`):choices.first()).click();else await page.locator('#next-button').click();}throw Error('활동 진입 실패 '+id);};
  const pace=motion==='reduce'?700:400;
  for(const [key,times]of [['three',3],['four',4],['six',6]]){
   await enter('ch3-3',key);await page.locator('#run').click();
   assert.equal(await page.locator('#next-button').isEnabled(),false,'자동 실행 직후 아직 완료되지 않음');
   assert.match(await page.locator('#loop-count').innerText(),new RegExp('0 / '+times));
   assert.equal(await page.locator('#light-on-code.trace').count(),1);
   const color=await page.locator('#count-light').evaluate(el=>getComputedStyle(el).backgroundColor);
   await page.clock.runFor(pace);assert.equal(await page.locator('#light-wait-code.trace').count(),1);
   await page.clock.runFor(pace);assert.match(await page.locator('#loop-count').innerText(),new RegExp('1 / '+times));
   assert.equal(await page.locator('#light-off-code.trace').count(),1);
   if(motion==='reduce')assert.equal(await page.locator('#count-light').evaluate(el=>getComputedStyle(el).backgroundColor),color,'동작 줄이기에서는 전구의 밝기를 번쩍이지 않음');
   await page.locator('#stop').click();await page.clock.runFor(pace*2);assert.match(await page.locator('#loop-count').innerText(),new RegExp('1 / '+times));
   await page.locator('#run').click();assert.match(await page.locator('#loop-count').innerText(),new RegExp('1 / '+times),'일시 정지 후 완료 횟수 유지');assert.equal(await page.locator('#light-on-code.trace').count(),1);
   await page.clock.runFor(20000);assert.equal(await page.locator('#next-button').isEnabled(),true);assert.match(await page.locator('#loop-count').innerText(),new RegExp(times+' / '+times));
   await page.locator('#run').click();assert.match(await page.locator('#loop-count').innerText(),new RegExp('0 / '+times),'완료 후 실행은 처음부터');await page.locator('#stop').click();
  }
  checks.push(`${motion}: 조명 3·4·6회 명령별 진행·마지막 완료·일시 정지 후 재개·완료 후 새 실행`);
  for(const [key,sides]of [['triangle',3],['square',4],['hexagon',6]]){
   await enter('ch3-4',key);await page.locator('#fit').click();await page.locator('#run').click();
   assert.equal(await page.locator('#next-button').isEnabled(),false);
   assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/1번 이동, 0번 회전/);
   if(key==='triangle')await page.screenshot({path:path.join(output,`playback-${motion}-move.png`)});
   await page.clock.runFor(pace);assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/1번 이동, 1번 회전/);
   if(key==='triangle')await page.screenshot({path:path.join(output,`playback-${motion}-turn.png`)});
   await page.locator('#stop').click();await page.clock.runFor(pace*2);assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/1번 이동, 1번 회전/);await page.locator('#run').click();assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/2번 이동, 1번 회전/,'일시 정지 후 다음 명령부터 재개');
   await page.clock.runFor(20000);assert.equal(await page.locator('#next-button').isEnabled(),true);assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),new RegExp(sides+'번 이동, '+sides+'번 회전'));
   await page.locator('#run').click();assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/1번 이동, 0번 회전/,'완료 후 실행은 처음부터');await page.locator('#stop').click();
  }
  checks.push(`${motion}: 세 도형 이동→회전→완성 과정·일시 정지 후 재개·완료 후 새 실행`);
  await enter('ch3-4','triangle');await page.locator('#run').click();await page.clock.runFor(20000);assert.equal(await page.locator('#next-button').isEnabled(),false);assert.match(await page.locator('#result').innerText(),/다시 살펴/);
  await page.locator('#fit').click();await page.locator('#run').click();await page.locator('#teacher-button').click();const paused=await page.locator('#polygon-stage').getAttribute('aria-label');await page.clock.runFor(pace*4);assert.equal(await page.locator('#polygon-stage').getAttribute('aria-label'),paused);await page.locator('[data-close="notes-dialog"]').click();await page.clock.runFor(pace);assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/1번 이동, 1번 회전/);
  await page.locator('#stop').click();const stopped=await page.locator('#polygon-stage').getAttribute('aria-label');await page.clock.runFor(pace*3);assert.equal(await page.locator('#polygon-stage').getAttribute('aria-label'),stopped);
  await page.locator('#turn').selectOption('90');await page.clock.runFor(pace*2);assert.match(await page.locator('#polygon-stage').getAttribute('aria-label'),/0번 이동, 0번 회전/);
  await page.locator('#run').click();await jump('ch1-1');await page.clock.runFor(20000);assert.equal(await page.locator('#polygon-stage').count(),0);assert.equal(await page.locator('#stage').getAttribute('data-voice'),'narration');
  checks.push(`${motion}: 잘못된 각도·모달 보류·정지·입력 변경·장면 이탈 정리`);
  if(motion==='reduce'){
   assert.equal(await page.locator('.app-origin').isVisible(),false);
   await page.locator('#next-button').click();assert.equal(await page.locator('#stage').getAttribute('data-medium'),'app');assert.equal(await page.locator('.app-origin').isVisible(),true);assert.equal(await page.locator('.app-origin img').evaluate(img=>img.complete&&img.naturalWidth>0),true);await page.screenshot({path:path.join(output,'app-message-1366.png')});
   await page.locator('#next-button').click();assert.equal(await page.locator('#stage').getAttribute('data-medium'),'app');assert.match(await page.locator('#dialogue-text').innerText(),/같이 다닐래/);
   await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const text=await page.locator('#dialogue-text').boundingBox(),box=await page.locator('.dialogue-box').boundingBox();assert.ok(text.x>=box.x&&text.x+text.width<=box.x+box.width);await page.screenshot({path:path.join(output,'app-message-390.png'),fullPage:true});
   await page.setViewportSize({width:1366,height:768});await jump('ch2-1');await page.locator('#next-button').click();assert.equal(await page.locator('.app-origin').isVisible(),false);await page.locator('#next-button').click();assert.equal(await page.locator('.app-origin').isVisible(),true);assert.match(await page.locator('#dialogue-text').innerText(),/12분 전/);await page.screenshot({path:path.join(output,'app-arrival-1366.png')});
   checks.push('앱 알림·채팅 전용 이미지와 HTML 문구·내 생각/현장 대화 구분·390px');
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 const report={status:'pass',checks,errors,remoteRequests:remote.length,clock:'Playwright controlled clock; real scheduled intervals advanced one command at a time',at:new Date().toISOString()};fs.writeFileSync(path.join(output,'playback-app-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
