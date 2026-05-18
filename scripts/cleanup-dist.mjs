/**
 * Cleanup dist folder after build
 * - Removes any accidentally copied node_modules and source files
 * - Removes duplicate large folders from root (drinks, images already in app/)
 * - Verifies critical files exist
 * - Reports final dist size
 */
import { rmSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist');

// Large files to always remove from dist (unused assets that bloat deploy)
const REMOVE_LARGE_FILES = [
  'images/3Dcup.glb',       // 20MB unused original model (only 3Dcup_tiny.glb is used)
  'images/3Dcup_opt.glb',   // 1.2MB unused intermediate model
  'eats/Выпечка.svg',       // 112MB Figma source file
  'eats/Выпечка.webp',      // derivative of above
];

// Paths to always remove from dist
const REMOVE_PATHS = [
  // Landing build artifacts (root-level copy)
  'landing/node_modules',
  'landing/src',
  'landing/.env',
  'landing/.env.local',
  'landing/package.json',
  'landing/package-lock.json',
  'landing/tsconfig.json',
  'landing/vite.config.ts',
  'landing/tailwind.config.ts',
  'landing/postcss.config.js',
  'landing/eslint.config.js',
  // App landing duplicates (Vite copies public/landing/ into dist/app/)
  'app/landing/node_modules',
  'app/landing/src',
  'app/landing/.env',
  'app/landing/.env.local',
  'app/landing/package.json',
  'app/landing/package-lock.json',
  'app/landing/tsconfig.json',
  'app/landing/vite.config.ts',
  'app/landing/tailwind.config.ts',
  'app/landing/postcss.config.js',
  'app/landing/eslint.config.js',
  // Duplicate image folders inside app/ (already at root via copy-public)
  // Skip removal when building for Capacitor — native needs these in webDir
  ...(process.env.CAPACITOR_BUILD === 'true' ? [] : [
    'app/drinks',
    'app/eats',
    'app/images',
    'app/uploads',
    'app/locales',
  ]),
];

// Critical files that must exist after build:web (admin/landing/workshop built separately)
const REQUIRED_FILES = [
  'sw.js',
  'manifest.json',
  'firebase-messaging-sw.js',
  'coffeeaddict.jpg',
  'app/index.html',
];

// Optional files — only present after build:all
const OPTIONAL_FILES = [
  'landing/index.html',
  'admin/index.html',
  'workshop/index.html',
];

function getDirSize(dirPath) {
  let size = 0;
  
  function walk(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          size += statSync(fullPath).size;
        }
      }
    } catch (e) {
      // Skip inaccessible dirs
    }
  }
  
  walk(dirPath);
  return size;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

console.log('🧹 Cleaning up dist folder...');

// Remove known large unused files
for (const relPath of REMOVE_LARGE_FILES) {
  const fullPath = join(DIST_DIR, relPath);
  if (existsSync(fullPath)) {
    const size = formatSize(statSync(fullPath).size);
    console.log(`  🗑️  Removing large file: ${relPath} (${size})`);
    rmSync(fullPath, { force: true });
  }
}

// Remove unwanted paths
for (const relPath of REMOVE_PATHS) {
  const fullPath = join(DIST_DIR, relPath);
  if (existsSync(fullPath)) {
    console.log(`  🗑️  Removing: ${relPath}`);
    rmSync(fullPath, { recursive: true, force: true });
  }
}

// Verify required files
console.log('\n✅ Verifying required files:');
let allPresent = true;
for (const relPath of REQUIRED_FILES) {
  const fullPath = join(DIST_DIR, relPath);
  const exists = existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${relPath}`);
  if (!exists) allPresent = false;
}

// Check optional files (only present after build:all)
for (const relPath of OPTIONAL_FILES) {
  const fullPath = join(DIST_DIR, relPath);
  const exists = existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '⏭️ '} ${relPath} ${exists ? '' : '(skipped — run build:all)'}`);
}

// Calculate and report final size
const totalSize = getDirSize(DIST_DIR);
console.log(`\n📊 Total dist size: ${formatSize(totalSize)}`);

// 100MB is reasonable for app with images
if (totalSize > 100 * 1024 * 1024) {
  console.warn('⚠️  WARNING: dist size > 100MB! Consider optimizing images.');
} else {
  console.log('✅ Dist size is acceptable');
}

if (!allPresent) {
  console.error('\n❌ Some required files are missing! Build may be incomplete.');
  process.exit(1);
}

console.log('\n🎉 Dist cleanup complete!');
