/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const source = path.join(__dirname, 'src');
const assetPath = path.join(__dirname, 'assets');
const read = file => fs.readFileSync(path.join(source,file),'utf8');
const image = file => `data:image/png;base64,${fs.readFileSync(path.join(assetPath,file)).toString('base64')}`;
const assets = {background:image('festival-courtyard-preview.png'),night:image('night-study.png'),dusk:image('twilight-field.png'),boy:image('haru-boy-v3.png'),girl:image('haru-girl-v3.png')};
const chapters=[1,2,3].map(n=>require(path.join(source,'chapters',`ch${n}.cjs`)));
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
let html=read('shell.html');
for(const [marker,value] of Object.entries({'/* STYLES */':read('styles.css'),'/* DATA */':`window.FESTIVAL_ASSETS=${safeJson(assets)};window.FESTIVAL_CHAPTERS=${safeJson(chapters)};`,'/* MODELS */':read('models.js'),'/* STATE */':read('state.js'),'/* EXPERIMENTS */':read('experiments.js'),'/* APP */':read('app.js')}))html=html.replace(marker,()=>value);
const output = path.join(root,'dist','festival-romance.html');
fs.mkdirSync(path.dirname(output),{recursive:true});html=html.replace(/\r\n?/g,'\n');fs.writeFileSync(output,html);
console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),chapters:chapters.length,scenes:chapters.reduce((n,c)=>n+c.scenes.length,0)}));
