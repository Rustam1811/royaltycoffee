/**
 * Convert all eats images to WebP format for fast loading
 * Also renames files to clean slugs for URL-friendliness
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EATS_DIR = path.join(__dirname, '..', 'public', 'eats');

let converted = 0;
let errors = 0;

async function convertToWebP(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;

  const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  // Skip if webp already exists
  if (fs.existsSync(webpPath)) {
    console.log(`  ⏭️  Already exists: ${path.basename(webpPath)}`);
    return;
  }

  try {
    await sharp(filePath)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(webpPath);

    const originalSize = fs.statSync(filePath).size;
    const webpSize = fs.statSync(webpPath).size;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    console.log(`  ✅ ${path.basename(filePath)} → ${path.basename(webpPath)} (${savings}% smaller)`);
    converted++;
  } catch (error) {
    console.error(`  ❌ Error converting ${filePath}:`, error.message);
    errors++;
  }
}

async function main() {
  console.log('🍞 Converting eats images to WebP...\n');

  if (!fs.existsSync(EATS_DIR)) {
    console.error(`Directory not found: ${EATS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(EATS_DIR).sort();
  for (const file of files) {
    await convertToWebP(path.join(EATS_DIR, file));
  }

  console.log(`\n📊 Summary: ✅ ${converted} converted, ❌ ${errors} errors`);
}

main().catch(console.error);
