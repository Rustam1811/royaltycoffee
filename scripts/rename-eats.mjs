/**
 * Rename eats images to clean, URL-safe slugs
 * Renames both PNG and WebP files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EATS_DIR = path.join(__dirname, '..', 'public', 'eats');

// Mapping: old name (without extension) → new slug
const RENAME_MAP = {
  'exportedLayer':      'eat-01',
  'exportedLayer (1)':  'eat-02',
  'exportedLayer (3)':  'eat-03',
  'exportedLayer (5)':  'eat-04',
  'exportedLayer (6)':  'eat-05',
  'exportedLayer (7)':  'eat-06',
  'exportedLayer (10)': 'eat-07',
  'exportedLayer (11)': 'eat-08',
  'exportedLayer (12)': 'eat-09',
  'exportedLayer (13)': 'eat-10',
  'exportedLayer (17)': 'eat-11',
  'exportedLayer (18)': 'eat-12',
  'exportedLayer (21)': 'eat-13',
  'exportedLayer (22)': 'eat-14',
  'exportedLayer (23)': 'eat-15',
  'exportedLayer (25)': 'eat-16',
  'exportedLayer (34)': 'eat-17',
  'exportedLayer (36)': 'eat-18',
  'exportedLayer (39)': 'eat-19',
  'exportedLayer (40)': 'eat-20',
  'exportedLayer (41)': 'eat-21',
  'exportedLayer (43)': 'eat-22',
  'exportedLayer (46)': 'eat-23',
  'exportedLayer (49)': 'eat-24',
  'exportedLayer (52)': 'eat-25',
  'exportedLayer (55)': 'eat-26',
  'exportedLayer (56)': 'eat-27',
  'exportedLayer (58)': 'eat-28',
  'exportedLayer (61)': 'eat-29',
  'exportedLayer (62)': 'eat-30',
  'exportedLayer (63)': 'eat-31',
  'exportedLayer (65)': 'eat-32',
  'exportedLayer (68)': 'eat-33',
  'exportedLayer (71)': 'eat-34',
  'exportedLayer (75)': 'eat-35',
  'exportedLayer (76)': 'eat-36',
  'copy_73966B80-57A3-4E55-BBE7-76AFA59D6178': 'eat-37',
  'copy_E18977ED-3DFD-4D64-A4F9-A5B2E6FF7AC3': 'eat-38',
};

let renamed = 0;

for (const [oldBase, newBase] of Object.entries(RENAME_MAP)) {
  for (const ext of ['.png', '.webp']) {
    const oldPath = path.join(EATS_DIR, oldBase + ext);
    const newPath = path.join(EATS_DIR, newBase + ext);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`  ✅ ${oldBase}${ext} → ${newBase}${ext}`);
      renamed++;
    }
  }
}

console.log(`\n📊 Renamed ${renamed} files`);

// Print the image path mapping for reference
console.log('\n📋 New image paths:');
for (const [, newBase] of Object.entries(RENAME_MAP)) {
  console.log(`  /eats/${newBase}.webp`);
}
