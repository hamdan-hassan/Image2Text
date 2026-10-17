import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = join(root, 'playstore screenshots');
const outDir = join(root, 'store-assets');
const assetsDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });

const FONT = 'Segoe UI, Arial, sans-serif';

const SHOTS = {
  home: join(shotsDir, 'WhatsApp Image 2026-08-25 at 15.35.52 (3).jpeg'),
  editor: join(shotsDir, 'WhatsApp Image 2026-08-25 at 15.35.52 (2).jpeg'),
  result: join(shotsDir, 'WhatsApp Image 2026-08-25 at 15.35.52 (1).jpeg'),
  history: join(shotsDir, 'WhatsApp Image 2026-08-25 at 15.35.52.jpeg'),
  settings: join(shotsDir, 'WhatsApp Image 2026-08-25 at 15.35.51.jpeg'),
};

const PAGES = [
  { key: 'home', file: 'phone-1-home.jpg', title: 'Scan any document in seconds', sub: "Take a photo or pick an image — that's all it takes" },
  { key: 'editor', file: 'phone-2-editor.jpg', title: 'Perfect the shot before extracting', sub: 'Crop and rotate right on your phone' },
  { key: 'result', file: 'phone-3-result.jpg', title: 'Instant, editable text', sub: 'Copy, share or save with one tap' },
  { key: 'history', file: 'phone-4-history.jpg', title: 'Every scan, saved and searchable', sub: 'Your full history lives on your phone' },
  { key: 'settings', file: 'phone-5-settings.jpg', title: 'Five languages. Fully offline.', sub: 'Dark mode included' },
];

const W = 1080;
const H = 1920;
const SHOT_H = 1180;
const SHOT_W = Math.round((SHOT_H * 576) / 1280); // 531
const FRAME_X = Math.round((W - SHOT_W) / 2);
const FRAME_Y = 340;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function phoneBaseSvg(page) {
  const bx = FRAME_X - 12;
  const by = FRAME_Y - 12;
  const bw = SHOT_W + 24;
  const bh = SHOT_H + 24;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B1D52"/>
      <stop offset="1" stop-color="#1C0D28"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="180" cy="260" r="420" fill="#7C3AED" opacity="0.12"/>
  <circle cx="940" cy="1700" r="380" fill="#7C3AED" opacity="0.10"/>
  <text x="${W / 2}" y="170" text-anchor="middle" font-family="${FONT}" font-size="62" font-weight="700" fill="#FFFFFF">${esc(page.title)}</text>
  <text x="${W / 2}" y="238" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="400" fill="#C9BFE0">${esc(page.sub)}</text>
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="52" fill="#0E0A14" stroke="#574A70" stroke-width="3"/>
  <rect x="${FRAME_X + 14}" y="${FRAME_Y + SHOT_H - 6}" width="60" height="6" rx="3" fill="#3A2E4E"/>
  <g>
    <rect x="70" y="1798" width="64" height="64" rx="16" fill="#FFFFFF"/>
    <circle cx="102" cy="1822" r="10" fill="#7C3AED"/>
    <path d="M88 1846 L102 1830 L112 1841 L118 1836 L126 1846 Z" fill="#7C3AED"/>
    <text x="152" y="1841" font-family="${FONT}" font-size="34" font-weight="700" fill="#FFFFFF">Image2Text</text>
    <text x="152" y="1876" font-family="${FONT}" font-size="24" font-weight="400" fill="#C9BFE0">Extract text from any image — offline</text>
  </g>
</svg>`;
}

async function roundedShot(inputPath) {
  const shot = await sharp(inputPath).resize(SHOT_W, SHOT_H).toBuffer();
  const mask = Buffer.from(
    `<svg width="${SHOT_W}" height="${SHOT_H}"><rect width="${SHOT_W}" height="${SHOT_H}" rx="40" fill="#fff"/></svg>`
  );
  return sharp(shot).composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
}

for (const page of PAGES) {
  const base = Buffer.from(phoneBaseSvg(page));
  const shot = await roundedShot(SHOTS[page.key]);
  await sharp(base)
    .composite([{ input: shot, left: FRAME_X, top: FRAME_Y }])
    .jpeg({ quality: 92 })
    .toFile(join(outDir, page.file));
  console.log('phone:', page.file);
}

// ---------- Feature graphic (1024x500) ----------
const iconBuf = await sharp(join(assetsDir, 'icon.png')).resize(150, 150).toBuffer();
const resultShot = await sharp(SHOTS.result).resize(171, 380).toBuffer();
const shotMask = Buffer.from('<svg width="171" height="380"><rect width="171" height="380" rx="18" fill="#fff"/></svg>');
const resultRounded = await sharp(resultShot)
  .composite([{ input: await sharp(shotMask).png().toBuffer(), blend: 'dest-in' }])
  .png()
  .toBuffer();

const featureSvg = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B1D52"/>
      <stop offset="1" stop-color="#1C0D28"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="120" cy="90" r="260" fill="#7C3AED" opacity="0.14"/>
  <circle cx="920" cy="440" r="240" fill="#7C3AED" opacity="0.12"/>
  <rect x="770" y="52" width="195" height="396" rx="24" fill="#0E0A14" stroke="#574A70" stroke-width="3"/>
  <text x="70" y="288" font-family="${FONT}" font-size="68" font-weight="700" fill="#FFFFFF">Image2Text</text>
  <text x="72" y="340" font-family="${FONT}" font-size="30" font-weight="400" fill="#C9BFE0">Extract text from any image —</text>
  <text x="72" y="380" font-family="${FONT}" font-size="30" font-weight="400" fill="#C9BFE0">completely offline.</text>
  <g font-family="${FONT}" font-size="22" font-weight="600" fill="#FFFFFF">
    <rect x="72" y="412" width="108" height="46" rx="23" fill="#7C3AED"/>
    <text x="126" y="443" text-anchor="middle">Copy</text>
    <rect x="192" y="412" width="108" height="46" rx="23" fill="#5B21B6"/>
    <text x="246" y="443" text-anchor="middle">Share</text>
    <rect x="312" y="412" width="108" height="46" rx="23" fill="#5B21B6"/>
    <text x="366" y="443" text-anchor="middle">Save</text>
  </g>
  <text x="70" y="490" font-family="${FONT}" font-size="22" font-weight="400" fill="#A99BC4">No account · No uploads · Works offline</text>
</svg>`;

await sharp(Buffer.from(featureSvg))
  .composite([
    { input: await sharp(join(assetsDir, 'icon.png')).resize(120, 120).toBuffer(), left: 70, top: 72 },
    { input: resultRounded, left: 782, top: 60 },
  ])
  .jpeg({ quality: 92 })
  .toFile(join(outDir, 'feature-graphic.jpg'));
console.log('feature-graphic.jpg');

// ---------- 512 store icon ----------
await sharp(join(assetsDir, 'icon.png')).resize(512, 512).png().toFile(join(outDir, 'store-icon-512.png'));
console.log('store-icon-512.png');
console.log('Store assets generated in store-assets/');
