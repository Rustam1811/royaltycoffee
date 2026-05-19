#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'scripts', 'inventory.json');
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.css', '.scss', '.md', '.html']);
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage', '.cache', '.vscode', '.idea',
  '.husky', '.pnpm-store', '.vercel', '.firebase', '.nyc_output'
]);

function isExcludedDir(dir) {
  const base = path.basename(dir);
  return EXCLUDE_DIRS.has(base);
}

function getImportsExports(code, ext) {
  const imports = [];
  const exports = [];

  try {
    // naive import detection
    const importRegex = /import\s+(?:[^'";]+?from\s+)?["']([^"']+)["']/g;
    const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
    const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g;

    let m;
    while ((m = importRegex.exec(code))) imports.push(m[1]);
    while ((m = dynamicImportRegex.exec(code))) imports.push(m[1]);
    while ((m = requireRegex.exec(code))) imports.push(m[1]);

    // naive export detection
    const namedExportDecl = /export\s+(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g;
    const exportList = /export\s*\{([^}]+)\}/g;
    const defaultExport = /export\s+default\s+([A-Za-z0-9_]+)/g;

    while ((m = namedExportDecl.exec(code))) exports.push(m[1].trim());
    while ((m = exportList.exec(code))) {
      const names = m[1].split(',').map(s => s.split(' as ')[0].trim()).filter(Boolean);
      exports.push(...names);
    }
    while ((m = defaultExport.exec(code))) exports.push(`default:${m[1].trim()}`);
  } catch (e) {
    // ignore parsing issues; keep empty
  }

  return { imports: Array.from(new Set(imports)), exports: Array.from(new Set(exports)) };
}

async function walk(dir, acc = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcludedDir(full)) continue;
      await walk(full, acc);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!INCLUDE_EXT.has(ext)) continue;
      const stat = await fsp.stat(full);

      let code = '';
      try {
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif' && ext !== '.webp') {
          code = await fsp.readFile(full, 'utf8');
        }
      } catch {}

      const { imports, exports } = getImportsExports(code, ext);
      acc.push({
        path: path.relative(ROOT, full).replace(/\\/g, '/'),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        ext,
        imports,
        exports,
      });
    }
  }
  return acc;
}

(async () => {
  try {
    const data = await walk(ROOT, []);
    data.sort((a, b) => a.path.localeCompare(b.path));
    await fsp.writeFile(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), root: ROOT, files: data }, null, 2) + '\n', 'utf8');
    console.log(`Inventory written: ${OUT_FILE}`);
  } catch (e) {
    console.error('Failed to generate inventory', e);
    process.exit(1);
  }
})();
