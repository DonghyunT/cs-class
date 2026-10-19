/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'dist/festival-romance.html'),'utf8');
test('독립 HTML에 세 챕터·27장면과 올바른 헤더가 포함된다',()=>{
  assert.equal((html.match(/"id":"ch[1-3]-[1-9]"/g)||[]).length,27);
  assert.ok(html.includes('정보 · 프로그래밍'));assert.ok(!html.includes('금옥중학교'));
  assert.ok(Buffer.byteLength(html)<=20000000);assert.ok(!/본문 제작 예정/.test(html));
});
test('외부 리소스 없이 모든 내장 스크립트의 문법이 유효하다',()=>{
  assert.ok(!/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(html));assert.ok(!/@import\s|\bfetch\s*\(|\bimport\s*\(/.test(html));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,5);
  for(const [i,s]of scripts.entries())assert.doesNotThrow(()=>new vm.Script(s[1],{filename:`embedded-${i}.js`}));
});
test('운영 안내와 수정 가능한 소스가 있다',()=>{
  const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');assert.ok(readme.includes('27개 장면'));
  assert.ok(fs.existsSync(path.join(root,'src/app.js')));
});
