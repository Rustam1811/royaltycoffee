#!/usr/bin/env python3
"""
Extract food images from SVG by rendering at high resolution and cropping.
Preserves burgundy (#792311) background circles exactly as designed.
"""
import re, subprocess, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("pip install Pillow")

SVG_PATH = Path("public/eats/Выпечка.svg")
OUT_DIR = Path("public/eats")
OUT_SIZE = 512
QUALITY = 95

# SVG viewBox is 0 0 1440 810
SVG_W = 1440
SCALE = 8  # render at 8x = 11520px wide
RENDER_W = SVG_W * SCALE

# Circle positions in SVG coordinates (from analysis)
# Each circle is ~64px diameter, centers at ~(x+32, y+32)
circles = [
    # Row 1 (y=11): items 1-3 only (item 0 has wrong x from analysis)
    # Actually, let me fix: first item was x=4,y=11 but got filtered oddly
    # Re-reading: items at y=11 start at x varies
]

# Parse positions from SVG directly
with open(SVG_PATH, "r") as f:
    content = f.read()

indices = [m.start() for m in re.finditer(r'fill="#792311"', content)]

positions = []
for idx in indices:
    start = max(0, idx - 2000)
    chunk = content[start:idx]
    transforms = re.findall(r'transform="matrix\(([^"]+)\)"', chunk)
    if len(transforms) >= 2:
        t = transforms[-2]
        parts = [float(x.strip()) for x in t.split(",")]
        tx, ty = parts[4], parts[5]
        # Skip items at (0,0) or (-0,0) or (0,1) - these are misparses
        if ty > 5:
            positions.append((tx, ty))

# Some positions are missing (items 1, 6, 20, 32 had x=0/y=0 issues)
# Rebuild the full grid properly
# From the data: rows at y = 11, 83, 155, 228, 300, 372, 444, 516, 589, 661, 733
# Cols at x ~= 4, 82-84, 161-163, 241-243
# Let's use a cleaner approach: known grid

ROW_YS = [11, 83, 155, 228, 300, 372, 444, 516, 589, 661, 733]
COL_XS = [4, 83, 163, 242]
CIRCLE_SIZE = 64  # diameter in SVG units

# Build all 43 positions
all_positions = []
for row_idx, y in enumerate(ROW_YS):
    cols_in_row = 4 if row_idx < 10 else 3  # last row has 3
    for col_idx in range(cols_in_row):
        x = COL_XS[col_idx]
        all_positions.append((x, y))

print(f"Grid: {len(all_positions)} items")

# Step 1: Render SVG to high-res PNG
print(f"Rendering SVG at {RENDER_W}px wide ({SCALE}x)...")
tmp_png = "/tmp/eats_hires.png"

# Use rsvg-convert if available, otherwise sips
try:
    subprocess.run(["which", "rsvg-convert"], check=True, capture_output=True)
    subprocess.run([
        "rsvg-convert", "-w", str(RENDER_W), 
        str(SVG_PATH), "-o", tmp_png
    ], check=True)
except (subprocess.CalledProcessError, FileNotFoundError):
    # Fall back to sips (macOS)
    print("Using sips for conversion...")
    subprocess.run([
        "sips", "-s", "format", "png",
        "-z", str(int(810 * SCALE)), str(RENDER_W),
        str(SVG_PATH), "--out", tmp_png
    ], check=True, capture_output=True)

# Load the rendered image
print("Loading rendered image...")
full_img = Image.open(tmp_png).convert("RGBA")
actual_w, actual_h = full_img.size
print(f"Rendered size: {actual_w}x{actual_h}")

# Calculate actual scale
actual_scale = actual_w / SVG_W

# Create circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

# Extract each circle
for i, (svg_x, svg_y) in enumerate(all_positions):
    num = i + 1
    fname = f"eat-{num:02d}.webp"
    
    # Convert SVG coords to pixel coords
    px_x = int(svg_x * actual_scale)
    px_y = int(svg_y * actual_scale)
    px_size = int(CIRCLE_SIZE * actual_scale)
    
    # Crop the circle area
    crop = full_img.crop((px_x, px_y, px_x + px_size, px_y + px_size))
    
    # Resize to output size
    crop = crop.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    
    # Apply circular mask
    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    result.paste(crop, (0, 0), mask)
    
    out_path = OUT_DIR / fname
    result.save(str(out_path), "WEBP", quality=QUALITY)
    print(f"  {fname}")

print(f"\nDone! Extracted {len(all_positions)} images to {OUT_DIR}/")
