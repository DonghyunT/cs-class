/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');
const root = __dirname;
const source = path.join(__dirname, 'src');
const assetPath = path.join(__dirname, 'assets');
const read = file => fs.readFileSync(path.join(source,file),'utf8');
const image = file => `data:image/png;base64,${fs.readFileSync(path.join(assetPath,file)).toString('base64')}`;
const assets = {background:image('festival-courtyard-preview.png'),night:image('night-study.png'),dusk:image('twilight-field.png'),boy:image('haru-boy-v6.png'),girl:image('haru-girl-v6.png')};
const chapters=[1,2,3].map(n=>require(path.join(source,'chapters',`ch${n}.cjs`)));
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
let html=read('shell.html');
for(const [marker,value] of Object.entries({'/* STYLES */':read('styles.css'),'/* DATA */':`window.FESTIVAL_ASSETS=${safeJson(assets)};window.FESTIVAL_CHAPTERS=${safeJson(chapters)};`,'/* MODELS */':read('models.js'),'/* STATE */':read('state.js'),'/* EXPERIMENTS */':read('experiments.js'),'/* APP */':read('app.js')}))html=html.replace(marker,()=>value);
const output = path.join(root,'dist','festival-romance.html');
const published=path.resolve(root,'../../public/festival-romance.html');
html=html.replace(/\r\n?/g,'\n');
for(const file of [output,published]){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);}
fs.writeFileSync(path.join(root,'qa/build-manifest.json'),JSON.stringify({html:'festival-romance.html',publicPath:'/festival-romance.html',bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),offlinePublicMatches:true},null,2)+'\n');
console.log(JSON.stringify({output,published,bytes:Buffer.byteLength(html),chapters:chapters.length,scenes:chapters.reduce((n,c)=>n+c.scenes.length,0)}));
