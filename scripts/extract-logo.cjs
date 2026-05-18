const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const svg = fs.readFileSync('public/images/logo.svg', 'utf-8');
  const regex = /xlink:href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g;
  const matches = [...svg.matchAll(regex)];
  console.log('Found', matches.length, 'embedded PNG(s)');

  if (matches.length === 0) {
    console.log('No embedded PNGs found');
    return;
  }

  // Take the first (and likely only) embedded PNG
  const buf = Buffer.from(matches[0][1], 'base64');
  const meta = await sharp(buf).metadata();
  console.log('Extracted PNG:', meta.width, 'x', meta.height, 'format:', meta.format, 'hasAlpha:', meta.hasAlpha);

  // Trim transparent areas to get just the logo
  const trimmed = await sharp(buf).trim().toBuffer({ resolveWithObject: true });
  console.log('After trim:', trimmed.info.width, 'x', trimmed.info.height);

  const size = Math.max(trimmed.info.width, trimmed.info.height);

  // icon-192.png — cream bg, for browser tab and 'any' purpose
  await sharp(trimmed.data)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(192, 192)
    .flatten({ background: { r: 244, g: 237, b: 228 } })
    .png()
    .toFile('public/icon-192.png');
  console.log('✅ icon-192.png done');

  // icon-512.png — cream bg
  await sharp(trimmed.data)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(512, 512)
    .flatten({ background: { r: 244, g: 237, b: 228 } })
    .png()
    .toFile('public/icon-512.png');
  console.log('✅ icon-512.png done');

  // icon-512-maskable.png — burgundy bg with safe-zone padding (10% each side)
  const maskPad = Math.round(512 * 0.10);
  await sharp(trimmed.data)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(512 - maskPad * 2, 512 - maskPad * 2)
    .extend({ top: maskPad, bottom: maskPad, left: maskPad, right: maskPad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: { r: 61, g: 10, b: 17 } })
    .png()
    .toFile('public/icon-512-maskable.png');
  console.log('✅ icon-512-maskable.png done');
}

main().catch(e => console.error(e));
