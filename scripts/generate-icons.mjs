import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');

const BG = '<rect width="1024" height="1024" fill="url(#bg)"/>';
const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B1D52"/>
      <stop offset="1" stop-color="#22102E"/>
    </linearGradient>
    <clipPath id="photoClip"><rect x="372" y="210" width="280" height="200" rx="28"/></clipPath>
  </defs>`;

const EMBLEM = `
  <rect x="352" y="190" width="360" height="440" rx="44" fill="#000000" opacity="0.28"/>
  <rect x="332" y="170" width="360" height="440" rx="44" fill="#FFFFFF"/>
  <rect x="372" y="210" width="280" height="200" rx="28" fill="#EFE9FB"/>
  <g clip-path="url(#photoClip)">
    <circle cx="596" cy="266" r="24" fill="#A78BFA"/>
    <path d="M356 410 L472 296 L544 368 L596 322 L672 410 Z" fill="#7C3AED"/>
  </g>
  <rect x="372" y="446" width="280" height="26" rx="13" fill="#D9CFF3"/>
  <rect x="372" y="492" width="196" height="26" rx="13" fill="#D9CFF3"/>
  <rect x="372" y="538" width="132" height="26" rx="13" fill="#D9CFF3"/>
  <g stroke="#FFFFFF" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M346 706 L346 806"/>
    <path d="M392 740 C392 712 414 706 444 706 C476 706 494 720 494 746 C494 774 462 786 430 806"/>
    <path d="M392 806 L494 806"/>
    <path d="M540 706 L680 706"/>
    <path d="M610 706 L610 806"/>
  </g>`;

const MONO = `
  <g stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <rect x="332" y="170" width="360" height="440" rx="44"/>
    <rect x="372" y="210" width="280" height="200" rx="28"/>
    <path d="M384 392 L472 304 L544 376 L596 330 L648 382"/>
    <path d="M384 470 L640 470"/>
    <path d="M384 516 L560 516"/>
    <path d="M384 562 L516 562"/>
    <path d="M346 706 L346 806"/>
    <path d="M392 740 C392 712 414 706 444 706 C476 706 494 720 494 746 C494 774 462 786 430 806"/>
    <path d="M392 806 L494 806"/>
    <path d="M540 706 L680 706"/>
    <path d="M610 706 L610 806"/>
  </g>`;

const wrap = (inner) => `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${DEFS}${inner}</svg>`;

const fullIcon = wrap(`${BG}<circle cx="512" cy="430" r="330" fill="#7C3AED" opacity="0.10"/>${EMBLEM}`);
const foreground = wrap(
  `<g transform="translate(512 512) scale(0.72) translate(-512 -512)">${EMBLEM}</g>`
);
const splash = wrap(
  `<g transform="translate(512 512) scale(0.8) translate(-512 -512)">${EMBLEM}</g>`
);
const monochrome = wrap(
  `<g transform="translate(512 512) scale(0.72) translate(-512 -512)">${MONO}</g>`
);
const background = wrap('<rect width="1024" height="1024" fill="#2B1638"/>');

const targets = [
  ['icon.png', fullIcon, 1024],
  ['android-icon-foreground.png', foreground, 1024],
  ['android-icon-background.png', background, 1024],
  ['android-icon-monochrome.png', monochrome, 1024],
  ['splash-icon.png', splash, 1024],
  ['favicon.png', fullIcon, 48],
];

mkdirSync(assets, { recursive: true });

for (const [name, svg, size] of targets) {
  const out = join(assets, name);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${name}: ${meta.width}x${meta.height}`);
}

console.log('Icon assets generated.');
