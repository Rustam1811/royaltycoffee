#!/usr/bin/env python3
"""Crop individual food circles from the Chrome-rendered screenshot."""
import json, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("pip install Pillow")

OUT_DIR = Path("public/eats")
OUT_SIZE = 512
QUALITY = 95

# Load positions
with open("/tmp/eats_positions.json") as f:
    data = json.load(f)

screenshot = data["screenshot"]
scale = data["scale"]
diam = data["circleDiam"]
positions = data["positions"]

print(f"Loading screenshot: {screenshot}")
full = Image.open(screenshot).convert("RGBA")
print(f"Image size: {full.size}")

# Circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

for p in positions:
    num = p["num"]
    sx, sy = p["x"], p["y"]
    
    # Pixel coords
    px = int(sx * scale)
    py = int(sy * scale)
    ps = int(diam * scale)
    
    # Crop
    crop = full.crop((px, py, px + ps, py + ps))
    crop = crop.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    
    # Apply circular mask
    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    result.paste(crop, (0, 0), mask)
    
    fname = f"eat-{num:02d}.webp"
    result.save(str(OUT_DIR / fname), "WEBP", quality=QUALITY)
    print(f"  {fname}")

print(f"\nDone! {len(positions)} images -> {OUT_DIR}/")
