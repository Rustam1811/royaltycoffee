#!/usr/bin/env python3
"""
Extract food images from SVG using cairosvg for proper rendering.
Preserves burgundy background circles exactly as in the original SVG.
"""
import sys, io
from pathlib import Path

try:
    import cairosvg
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("pip install cairosvg Pillow")

SVG_PATH = Path("public/eats/Выпечка.svg")
OUT_DIR = Path("public/eats")
OUT_SIZE = 512
QUALITY = 95

# SVG viewBox: 0 0 1440 810
SVG_W = 1440
# Render at high scale for quality
SCALE = 8
RENDER_W = SVG_W * SCALE  # 11520

# Grid positions in SVG coordinates (from analysis)
ROW_YS = [11, 83, 155, 228, 300, 372, 444, 516, 589, 661, 733]
COL_XS = [4, 83, 163, 242]
CIRCLE_DIAM = 64  # diameter in SVG units

# Build all 43 positions
positions = []
for row_idx, y in enumerate(ROW_YS):
    cols_in_row = 4 if row_idx < 10 else 3
    for col_idx in range(cols_in_row):
        positions.append((COL_XS[col_idx], y))

print(f"Grid: {len(positions)} items")

# Render SVG to PNG using cairosvg
print(f"Rendering SVG at {RENDER_W}px wide...")
svg_data = SVG_PATH.read_bytes()
png_data = cairosvg.svg2png(bytestring=svg_data, output_width=RENDER_W)

# Load rendered image
full_img = Image.open(io.BytesIO(png_data)).convert("RGBA")
actual_w, actual_h = full_img.size
print(f"Rendered: {actual_w}x{actual_h}")

scale = actual_w / SVG_W

# Create circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

for i, (sx, sy) in enumerate(positions):
    num = i + 1
    fname = f"eat-{num:02d}.webp"

    # Convert SVG coords to pixel
    px = int(sx * scale)
    py = int(sy * scale)
    ps = int(CIRCLE_DIAM * scale)

    crop = full_img.crop((px, py, px + ps, px + ps - px + py))
    # Actually: crop square
    crop = full_img.crop((px, py, px + ps, py + ps))
    crop = crop.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)

    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    result.paste(crop, (0, 0), mask)

    out_path = OUT_DIR / fname
    result.save(str(out_path), "WEBP", quality=QUALITY)
    print(f"  {fname}")

print(f"\nDone! {len(positions)} images -> {OUT_DIR}/")
