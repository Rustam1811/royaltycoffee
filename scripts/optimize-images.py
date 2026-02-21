"""
Конвертация всех PNG напитков → WebP
- Ресайз до 512×512 (сохраняя пропорции)
- Качество 85%  →  ~30-80 КБ вместо 700-1300 КБ
- Сохраняет прозрачность (RGBA)
"""

import os, glob
from PIL import Image

DRINKS = os.path.join(os.path.dirname(__file__), '..', 'public', 'drinks')
MAX_SIZE = 512
QUALITY  = 85

pngs = sorted(glob.glob(os.path.join(DRINKS, '*.png')))
print(f'🖼  Конвертация {len(pngs)} PNG → WebP  (max {MAX_SIZE}px, quality {QUALITY}%)\n')

total_before = 0
total_after  = 0

for i, png_path in enumerate(pngs, 1):
    name = os.path.basename(png_path)
    webp_path = png_path.rsplit('.', 1)[0] + '.webp'

    before = os.path.getsize(png_path)
    total_before += before

    img = Image.open(png_path).convert('RGBA')

    # Ресайз с сохранением пропорций
    img.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)

    img.save(webp_path, 'WEBP', quality=QUALITY, method=6)

    after = os.path.getsize(webp_path)
    total_after += after

    ratio = (1 - after / before) * 100
    print(f'  [{i:2d}/{len(pngs)}] {name:40s} {before//1024:5d}KB → {after//1024:3d}KB  ({ratio:.0f}% saved)')

# Удаляем старые PNG
for png_path in pngs:
    os.remove(png_path)

print(f'\n🗑  Удалены {len(pngs)} старых PNG')
print(f'📊 Итого: {total_before//1024}KB → {total_after//1024}KB  (сэкономлено {(total_before-total_after)//1024}KB)')
print(f'🎊 Готово! Все картинки теперь .webp')
