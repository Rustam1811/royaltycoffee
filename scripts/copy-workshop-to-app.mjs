/**
 * Copy workshop build into dist/app/workshop for Capacitor
 * This makes /workshop/index.html accessible from native app
 */
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Cross-platform recursive copy (Node 16.7+ has fs.cpSync)
try {
  cpSync(WORKSHOP_SRC, WORKSHOP_DEST, { recursive: true });
  console.log('  ✅ Workshop copied to dist/app/workshop');
  console.log('🎉 Capacitor build ready!');
} catch (err) {
  console.error('  ❌ Copy failed:', err.message);
  process.exit(1);
}
