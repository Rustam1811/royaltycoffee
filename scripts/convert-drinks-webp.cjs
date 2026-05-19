/**
 * Convert drink PNGs to WebP and delete originals
 * Also updates drinksData.ts image paths from .png to .webp
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DRINKS_DIR = path.join(__dirname, '..', 'public', 'drinks');
const DATA_FILE = path.join(__dirname, '..', 'src', 'pages', 'menu', 'data', 'drinksData.ts');

async function main() {
  const pngs = fs.readdirSync(DRINKS_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${pngs.length} PNG files to convert\n`);

  let totalOriginal = 0;
  let totalWebp = 0;
  let converted = 0;

  for (const file of pngs) {
    const src = path.join(DRINKS_DIR, file);
    const dst = path.join(DRINKS_DIR, file.replace('.png', '.webp'));
    const origSize = fs.statSync(src).size;

    try {
      await sharp(src)
        .webp({ quality: 82, effort: 6 })
        .toFile(dst);

      const newSize = fs.statSync(dst).size;
      const savings = ((1 - newSize / origSize) * 100).toFixed(1);
      totalOriginal += origSize;
      totalWebp += newSize;
      converted++;

      console.log(
        `${converted}/${pngs.length} ${file} → ${(origSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB  (-${savings}%)`
      );

      // Delete original PNG
      fs.unlinkSync(src);
    } catch (err) {
      console.error(`ERROR converting ${file}:`, err.message);
    }
  }

  console.log(`\n✅ Converted ${converted} files`);
  console.log(`   Original total: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   WebP total:     ${(totalWebp / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Saved:          ${((totalOriginal - totalWebp) / 1024 / 1024).toFixed(1)} MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(0)}%)\n`);

  // Update drinksData.ts: .png → .webp
  let data = fs.readFileSync(DATA_FILE, 'utf8');
  const count = (data.match(/\/drinks\/[^']*\.png/g) || []).length;
  data = data.replace(/(\/drinks\/[^']*?)\.png/g, '$1.webp');
  fs.writeFileSync(DATA_FILE, data, 'utf8');
  console.log(`✅ Updated ${count} image paths in drinksData.ts (.png → .webp)`);

  // Also delete leftover exportedLayer files and JPGs
  const leftover = fs.readdirSync(DRINKS_DIR).filter(f => 
    f.startsWith('exportedLayer') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );
  if (leftover.length > 0) {
    leftover.forEach(f => {
      fs.unlinkSync(path.join(DRINKS_DIR, f));
      console.log(`🗑️  Deleted leftover: ${f}`);
    });
  }

  console.log('\nDone! Final files:');
  const final = fs.readdirSync(DRINKS_DIR).filter(f => f.endsWith('.webp')).sort();
  final.forEach(f => {
    const kb = Math.round(fs.statSync(path.join(DRINKS_DIR, f)).size / 1024);
    console.log(`  ${f} (${kb} KB)`);
  });
}

main().catch(console.error);
