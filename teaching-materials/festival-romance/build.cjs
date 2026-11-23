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
const toDataUri = (buffer, file = '') => {
  const mime = /\.webp$/i.test(file) ? 'image/webp' : 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
};
const image = (file) => toDataUri(readAsset(file), file);

function readImageDimensions(buffer, file) {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(PNG_SIGNATURE) &&
    buffer.toString('ascii', 12, 16) === 'IHDR'
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width, height };
    }
    if (chunk === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { width, height };
    }
  }
  throw new Error(`Invalid PNG/WebP header: ${file}`);
}

function detectSpriteRows(buffer, file) {
  const { width, height } = readImageDimensions(buffer, file);
  if (!width || !height) {
    throw new Error(`Invalid image dimensions (${width}x${height}): ${file}`);
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

const boySpriteFile = 'haru-boy-v15.webp';
const girlSpriteFile = 'haru-girl-v15.webp';
const boySprite = readAsset(boySpriteFile);
const girlSprite = readAsset(girlSpriteFile);
const boyRows = detectSpriteRows(boySprite, boySpriteFile);
const girlRows = detectSpriteRows(girlSprite, girlSpriteFile);
const spriteRows = { boy: boyRows, girl: girlRows };

const assets = {
  background: image('festival-courtyard-preview.webp'),
  night: image('night-study.webp'),
  dusk: image('twilight-field.webp'),
  lab: image('prologue-lab.webp'),
  rain: image('courtyard-rain.webp'),
  lit: image('field-lit.webp'),
  poster: image('beta-poster.webp'),
  boy: toDataUri(boySprite, boySpriteFile),
  girl: toDataUri(girlSprite, girlSpriteFile),
  app: image('festival-app-phone.webp'),
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
