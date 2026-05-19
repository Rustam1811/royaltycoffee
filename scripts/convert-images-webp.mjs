/**
 * Convert all images to WebP format for faster loading
 * Конвертирует PNG, JPG, JPEG в WebP с сохранением качества
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DRINKS_DIR = path.join(PUBLIC_DIR, 'drinks');
const EATS_DIR = path.join(PUBLIC_DIR, 'eats');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Статистика
let converted = 0;
let skipped = 0;
let errors = 0;

async function convertToWebP(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Только конвертируем PNG, JPG, JPEG
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    return;
  }

  const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  
  // Пропускаем если webp уже существует
  if (fs.existsSync(webpPath)) {
    skipped++;
    return;
  }

  try {
    await sharp(filePath)
      .webp({ 
        quality: 85,
        effort: 6 // Higher effort = better compression
      })
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

async function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠️  Directory not found: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      await processDirectory(itemPath);
    } else {
      await convertToWebP(itemPath);
    }
  }
}

async function main() {
  console.log('🖼️  Converting images to WebP format...\n');
  
  console.log('📁 Processing drinks folder...');
  await processDirectory(DRINKS_DIR);

  console.log('\n📁 Processing eats folder...');
  await processDirectory(EATS_DIR);
  
  console.log('\n📁 Processing images folder...');
  await processDirectory(IMAGES_DIR);
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Converted: ${converted} images`);
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  if (converted > 0) {
    console.log('\n💡 WebP images are typically 25-35% smaller than PNG/JPEG!');
  }
}

main().catch(console.error);
