"""
Extract individual food item circles from the Выпечка.svg rendered image.
Grid: 4 columns, 11 rows (last row 3 items). Total 43 items.
Output: eat-01.webp through eat-43.webp into public/eats/
"""
from PIL import Image, ImageDraw
import os

# Source: 4x rendered SVG at 5760x3240 (viewBox 1440x810, scale 4x)
SCALE = 4
src = Image.open("/tmp/vypechka_4x.png").convert("RGBA")
W, H = src.size  # 5760 x 3240

# Grid parameters (in viewBox coordinates, then multiply by SCALE)
# Measured from the 1440x810 render:
# First circle center: approximately x=590, y=38
# Column spacing: ~90px, Row spacing: ~74px
# Circle diameter: ~64px

COLS = 4
FIRST_CX = 590   # center X of first column
COL_GAP = 90      # horizontal spacing between column centers
FIRST_CY = 38     # center Y of first row
ROW_GAP = 74      # vertical spacing between row centers
RADIUS = 32       # circle radius in viewBox units

# Rows config: 10 rows of 4, 1 row of 3
rows = [4]*10 + [3]

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "eats")
OUT_SIZE = 256  # output image size

idx = 1
for row_i, count in enumerate(rows):
    cy = (FIRST_CY + row_i * ROW_GAP) * SCALE
    for col_j in range(count):
        cx = (FIRST_CX + col_j * COL_GAP) * SCALE
        r = RADIUS * SCALE
        
        # Crop square around the circle
        box = (cx - r, cy - r, cx + r, cy + r)
        crop = src.crop(box).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        
        # Apply circular mask
        mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, OUT_SIZE, OUT_SIZE), fill=255)
        
        # Create final image with transparency
        result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
        result.paste(crop, mask=mask)
        
        # Save as WebP
        fname = f"eat-{idx:02d}.webp"
        result.save(os.path.join(OUT_DIR, fname), "WEBP", quality=90)
        print(f"  ✅ {fname}")
        idx += 1

print(f"\n🎉 Extracted {idx-1} items to public/eats/")
