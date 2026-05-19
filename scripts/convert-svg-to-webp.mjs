/**
 * Convert SVG drink & eats images (Figma export) → WebP
 *
 * Drinks:  sorted frame numbers → semantic names from drinksData order
 * Eats:    sorted frame numbers → eat-01 … eat-NN
 *
 * After conversion:
 *  - Copies WebP to admin/public/drinks, admin/public/eats
 *  - Copies eats WebP to workshop/public/eats
 *  - Generates preview.html for visual verification
 *  - Backs up SVGs to _svg_backup/
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const DRINKS_DIR = path.join(ROOT, 'public', 'drinks');
const EATS_DIR = path.join(ROOT, 'public', 'eats');
const BACKUP_DIR = path.join(ROOT, '_svg_backup');

// Drink names in drinksData.ts product appearance order
const DRINK_NAMES = [
  'cappuccino', 'latte', 'caramelatte', 'americano', 'raf-coffee',
  'mokkachino', 'flat-white', 'masala-coffee', 'glintveyn-coffee',
  'matcha-latte', 'chai-tea',
  'raf-arahis', 'raf-lavanda', 'raf-medovik', 'raf-melon-cactus', 'raf-pistachio',
  'lemonade-kiwi-mint', 'lemonade-mango-passion', 'lemonade-mango-strawberry',
  'lemonade-raspberry-lychee', 'lemonade-peach-grapefruit',
  'ice-latte', 'ice-americano', 'ice-raf', 'ice-matcha', 'bamble',
  'milk-duet', 'cocoa', 'hot-chocolate',
];

// ─── Helpers ────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getSortedSvgs(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.svg'))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb;
    });
}

async function svgToWebp(svgPath, outPath, size = 512) {
  // Render SVG at higher resolution for quality, then save as WebP
  await sharp(svgPath, { density: 300 })
    .resize(size, size, { fit: 'inside', withoutEnlargement: false })
    .webp({ quality: 90, effort: 6 })
    .toFile(outPath);
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🔄 SVG → WebP conversion for drinks & eats\n');

  // ── 1. Backup SVGs ──
  ensureDir(path.join(BACKUP_DIR, 'drinks'));
  ensureDir(path.join(BACKUP_DIR, 'eats'));

  // ── 2. Convert DRINKS ──
  console.log('☕ DRINKS');
  const drinkSvgs = getSortedSvgs(DRINKS_DIR);
  console.log(`   Found ${drinkSvgs.length} SVGs, mapping first ${DRINK_NAMES.length} to semantic names\n`);

  const drinkResults = [];
  for (let i = 0; i < drinkSvgs.length; i++) {
    const svgFile = drinkSvgs[i];
    const svgPath = path.join(DRINKS_DIR, svgFile);
    const name = i < DRINK_NAMES.length
      ? DRINK_NAMES[i]
      : `extra-${String(i - DRINK_NAMES.length + 1).padStart(2, '0')}`;
    const webpFile = `${name}.webp`;
    const webpPath = path.join(DRINKS_DIR, webpFile);

    try {
      await svgToWebp(svgPath, webpPath);
      const svgSize = fs.statSync(svgPath).size;
      const webpSize = fs.statSync(webpPath).size;
      console.log(`   ${String(i + 1).padStart(2)}. ${svgFile} → ${webpFile}  (${(webpSize / 1024).toFixed(0)} KB)`);
      drinkResults.push({ index: i, svgFile, webpFile, name });
    } catch (err) {
      console.error(`   ❌ ${svgFile}: ${err.message}`);
    }

    // Backup SVG
    fs.copyFileSync(svgPath, path.join(BACKUP_DIR, 'drinks', svgFile));
  }

  // ── 3. Convert EATS ──
  console.log('\n🍞 EATS');
  const eatSvgs = getSortedSvgs(EATS_DIR);
  console.log(`   Found ${eatSvgs.length} SVGs → eat-01 through eat-${String(eatSvgs.length).padStart(2, '0')}\n`);

  const eatResults = [];
  for (let i = 0; i < eatSvgs.length; i++) {
    const svgFile = eatSvgs[i];
    const svgPath = path.join(EATS_DIR, svgFile);
    const num = String(i + 1).padStart(2, '0');
    const webpFile = `eat-${num}.webp`;
    const webpPath = path.join(EATS_DIR, webpFile);

    try {
      await svgToWebp(svgPath, webpPath);
      const webpSize = fs.statSync(webpPath).size;
      console.log(`   ${String(i + 1).padStart(2)}. ${svgFile} → ${webpFile}  (${(webpSize / 1024).toFixed(0)} KB)`);
      eatResults.push({ index: i, svgFile, webpFile });
    } catch (err) {
      console.error(`   ❌ ${svgFile}: ${err.message}`);
    }

    // Backup SVG
    fs.copyFileSync(svgPath, path.join(BACKUP_DIR, 'eats', svgFile));
  }

  // ── 4. Delete SVGs from public dirs ──
  console.log('\n🗑️  Removing SVGs from public/ (backed up to _svg_backup/)');
  for (const f of drinkSvgs) fs.unlinkSync(path.join(DRINKS_DIR, f));
  for (const f of eatSvgs)   fs.unlinkSync(path.join(EATS_DIR, f));

  // ── 5. Copy to admin ──
  const adminDrinks = path.join(ROOT, 'admin', 'public', 'drinks');
  const adminEats   = path.join(ROOT, 'admin', 'public', 'eats');
  ensureDir(adminDrinks);
  ensureDir(adminEats);

  console.log('\n📋 Copying to admin/public/drinks & admin/public/eats');
  for (const r of drinkResults) copyFile(path.join(DRINKS_DIR, r.webpFile), path.join(adminDrinks, r.webpFile));
  for (const r of eatResults)   copyFile(path.join(EATS_DIR, r.webpFile), path.join(adminEats, r.webpFile));
  console.log(`   ✅ ${drinkResults.length} drinks + ${eatResults.length} eats`);

  // ── 6. Copy eats to workshop ──
  const workshopEats = path.join(ROOT, 'workshop', 'public', 'eats');
  ensureDir(workshopEats);

  console.log('\n📋 Copying eats to workshop/public/eats');
  for (const r of eatResults) copyFile(path.join(EATS_DIR, r.webpFile), path.join(workshopEats, r.webpFile));
  console.log(`   ✅ ${eatResults.length} eats`);

  // ── 7. Generate preview HTML ──
  const previewPath = path.join(ROOT, '_svg_backup', 'preview.html');
  const html = generatePreview(drinkResults, eatResults);
  fs.writeFileSync(previewPath, html, 'utf8');
  console.log(`\n🖼️  Preview → _svg_backup/preview.html (open in browser to verify mapping)`);

  // ── Summary ──
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Drinks: ${drinkResults.length} WebP (${DRINK_NAMES.length} named + ${Math.max(0, drinkResults.length - DRINK_NAMES.length)} extras)`);
  console.log(`✅ Eats:   ${eatResults.length} WebP (eat-01 … eat-${String(eatResults.length).padStart(2, '0')})`);
  console.log(`📁 Copied to: admin/public/{drinks,eats}, workshop/public/eats`);
  console.log(`📁 SVG backup: _svg_backup/`);
  console.log('═'.repeat(60));

  if (eatResults.length > 38) {
    console.log(`\n⚠️  Eats: ${eatResults.length} images converted, but eatsData.ts only references eat-01 through eat-38.`);
    console.log('   Update eatsData.ts if you added new items, or remove extras.');
  }
  if (drinkResults.length > DRINK_NAMES.length) {
    console.log(`\n⚠️  Drinks: ${drinkResults.length - DRINK_NAMES.length} extra frames beyond the ${DRINK_NAMES.length} known drink names.`);
    console.log('   Extra files saved as extra-01.webp, etc. Update DRINK_NAMES if these are new items.');
  }

  console.log('\n🔍 IMPORTANT: Open _svg_backup/preview.html to verify the frame→name mapping is correct!');
}

function generatePreview(drinkResults, eatResults) {
  const card = (r, folder) => `
    <div style="text-align:center;margin:8px;width:110px">
      <img src="../public/${folder}/${r.webpFile}" width="85" height="85"
           style="border-radius:50%;border:2px solid #ddd;background:#f5f5f5" />
      <div style="font-size:11px;margin-top:4px;font-weight:600">${r.webpFile}</div>
      <div style="font-size:10px;color:#888">${r.svgFile}</div>
    </div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Image Preview</title>
<style>body{font-family:system-ui;padding:20px;background:#fafafa}
h2{margin:30px 0 10px;color:#333}.grid{display:flex;flex-wrap:wrap;gap:4px}</style></head>
<body>
<h1>☕ Drink & Eats Image Preview</h1>
<p>Verify that each image matches its assigned name. If wrong, adjust the DRINK_NAMES array in the script and re-run.</p>

<h2>☕ Drinks (${drinkResults.length})</h2>
<div class="grid">${drinkResults.map(r => card(r, 'drinks')).join('')}</div>

<h2>🍞 Eats (${eatResults.length})</h2>
<div class="grid">${eatResults.map(r => card(r, 'eats')).join('')}</div>
</body></html>`;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
