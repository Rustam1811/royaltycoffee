/**
 * Copy essential public files to dist root for PWA/Firebase Hosting
 * Only copies files that MUST be at root level (SW, manifest, favicon)
 * Large assets (drinks, images, uploads) are already in dist/app via Vite
 */
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const DIST_DIR = join(ROOT, 'dist');

// Only these files need to be at dist root for Firebase/PWA
const ROOT_FILES = [
  'sw.js',
  'firebase-messaging-sw.js',
  'manifest.json',
  'coffeeaddict.jpg',
  'favicon.png',
  'index.html',
];

// Folders to copy to root (needed for absolute paths like /drinks/, /eats/)
const ROOT_FOLDERS = ['locales', 'drinks', 'eats', 'images', 'uploads'];

console.log('📦 Copying essential files to dist root...');

// Copy essential root files
for (const fileName of ROOT_FILES) {
  const srcPath = join(PUBLIC_DIR, fileName);
  const destPath = join(DIST_DIR, fileName);
  
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
    console.log(`  ✅ ${fileName}`);
  } else {
    console.log(`  ⚠️  ${fileName} not found`);
  }
}

// Copy small folders needed at root
function copyRecursive(src, dest) {
  const stat = statSync(src);
  
  if (stat.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    const dir = dirname(dest);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    copyFileSync(src, dest);
  }
}

for (const folderName of ROOT_FOLDERS) {
  const srcPath = join(PUBLIC_DIR, folderName);
  const destPath = join(DIST_DIR, folderName);
  
  if (existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`  ✅ ${folderName}/`);
  }
}

console.log('✅ Essential files copied to dist/');
