/**
 * Copy workshop build into dist/app/workshop for Capacitor
 * This makes /workshop/index.html accessible from native app
 */
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WORKSHOP_SRC = join(ROOT, 'dist', 'workshop');
const WORKSHOP_DEST = join(ROOT, 'dist', 'app', 'workshop');

console.log('📦 Copying workshop to dist/app/workshop for Capacitor...');

if (!existsSync(WORKSHOP_SRC)) {
  console.log('  ⚠️  Workshop build not found. Run npm run build:workshop first.');
  process.exit(1);
}

// Clean destination
if (existsSync(WORKSHOP_DEST)) {
  rmSync(WORKSHOP_DEST, { recursive: true, force: true });
}
mkdirSync(WORKSHOP_DEST, { recursive: true });

// Use xcopy on Windows (handles cyrillic paths reliably)
const src = `${WORKSHOP_SRC}\\*`;
const dest = WORKSHOP_DEST;
try {
  execSync(`xcopy /E /I /Y "${src}" "${dest}"`, { stdio: 'ignore' });
  console.log('  ✅ Workshop copied to dist/app/workshop');
  console.log('🎉 Capacitor build ready!');
} catch (err) {
  console.error('  ❌ Copy failed:', err.message);
  process.exit(1);
}
