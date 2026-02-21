/**
 * Convert PNG images to WebP format for better performance
 * Usage: node scripts/convert-to-webp.mjs [folder]
 * Example: node scripts/convert-to-webp.mjs public/drinks
 * 
 * Requires: npm install sharp
 */
import { readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Check if sharp is installed
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ Sharp not installed. Run: npm install sharp');
  process.exit(1);
}

const targetFolder = process.argv[2] || 'public/drinks';
const FOLDER = join(ROOT, targetFolder);

if (!existsSync(FOLDER)) {
  console.error(`❌ Folder not found: ${FOLDER}`);
  process.exit(1);
}

let converted = 0;
let skipped = 0;
let totalSaved = 0;

async function convertFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;
  
  const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  
  // Skip if WebP already exists
  if (existsSync(webpPath)) {
    skipped++;
    return;
  }
  
  try {
    const originalSize = statSync(filePath).size;
    
    await sharp(filePath)
      .webp({ quality: 85 })
      .toFile(webpPath);
    
    const newSize = statSync(webpPath).size;
    const saved = originalSize - newSize;
    totalSaved += saved;
    
    console.log(`✅ ${basename(filePath)} → ${basename(webpPath)} (saved ${(saved / 1024).toFixed(1)} KB)`);
    converted++;
  } catch (err) {
    console.error(`❌ Failed: ${filePath}`, err.message);
  }
}

async function processFolder(folder) {
  const entries = readdirSync(folder, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(folder, entry.name);
    
    if (entry.isDirectory()) {
      await processFolder(fullPath);
    } else {
      await convertFile(fullPath);
    }
  }
}

console.log(`🖼️  Converting images in ${targetFolder} to WebP...\n`);

await processFolder(FOLDER);

console.log(`\n📊 Results:`);
console.log(`   Converted: ${converted}`);
console.log(`   Skipped (already exist): ${skipped}`);
console.log(`   Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);

if (converted > 0) {
  console.log(`\n⚠️  Don't forget to update image paths in code from .png/.jpg to .webp`);
}
