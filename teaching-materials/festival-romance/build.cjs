/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tooling uses CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = __dirname;
const source = path.join(root, 'src');
const assetPath = path.join(root, 'assets');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const read = (file) => fs.readFileSync(path.join(source, file), 'utf8');
const readAsset = (file) => fs.readFileSync(path.join(assetPath, file));
const toDataUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
const image = (file) => toDataUri(readAsset(file));

function detectSpriteRows(buffer, file) {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(PNG_SIGNATURE) ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error(`Invalid PNG IHDR header: ${file}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) {
    throw new Error(`Invalid PNG dimensions (${width}x${height}): ${file}`);
  }
  return height > width ? 2 : 1;
}

function loadChapters(chaptersDir) {
  const chapterFiles = fs
    .readdirSync(chaptersDir)
    .map((name) => {
      const match = /^ch(\d+)\.cjs$/.exec(name);
      return match ? { name, num: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.num - b.num);

  for (const required of [1, 2, 3]) {
    if (!chapterFiles.some((entry) => entry.num === required)) {
      throw new Error(`Missing required chapter module: ch${required}.cjs`);
    }
  }
  return chapterFiles.map((entry) => require(path.join(chaptersDir, entry.name)));
}

const boySpriteFile = 'haru-boy-v13.png';
const girlSpriteFile = 'haru-girl-v13.png';
const boySprite = readAsset(boySpriteFile);
const girlSprite = readAsset(girlSpriteFile);
const boyRows = detectSpriteRows(boySprite, boySpriteFile);
const girlRows = detectSpriteRows(girlSprite, girlSpriteFile);
const spriteRows = { boy: boyRows, girl: girlRows };

const assets = {
  background: image('festival-courtyard-preview.png'),
  night: image('night-study.png'),
  dusk: image('twilight-field.png'),
  boy: toDataUri(boySprite),
  girl: toDataUri(girlSprite),
  app: image('festival-app-phone.png'),
};

const chapters = loadChapters(path.join(source, 'chapters'));
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

let html = read('shell.html');
const dataScript =
  `window.FESTIVAL_ASSETS=${safeJson(assets)};` +
  `window.FESTIVAL_SPRITE_ROWS=${safeJson(spriteRows)};` +
  `window.FESTIVAL_CHAPTERS=${safeJson(chapters)};`;

for (const [marker, value] of Object.entries({
  '/* STYLES */': read('styles.css'),
  '/* DATA */': dataScript,
  '/* MODELS */': read('models.js'),
  '/* STATE */': read('state.js'),
  '/* EXPERIMENTS */': read('experiments.js'),
  '/* APP */': read('app.js'),
})) {
  html = html.replace(marker, () => value);
}

const output = path.join(root, 'dist', 'festival-romance.html');
const published = path.resolve(root, '../../public/festival-romance.html');
html = html.replace(/\r\n?/g, '\n');

for (const file of [output, published]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

fs.mkdirSync(path.join(root, 'qa'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'qa/build-manifest.json'),
  `${JSON.stringify(
    {
      html: 'festival-romance.html',
      publicPath: '/festival-romance.html',
      bytes: Buffer.byteLength(html),
      sha256: createHash('sha256').update(html).digest('hex'),
      offlinePublicMatches: true,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({
    output,
    published,
    bytes: Buffer.byteLength(html),
    chapters: chapters.length,
    scenes: chapters.reduce((n, c) => n + c.scenes.length, 0),
    spriteRows,
  }),
);
