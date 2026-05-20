#!/usr/bin/env python3
"""Extract individual food images directly from embedded PNGs in SVG - v2 high quality."""
import re, base64, io, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("pip install Pillow")

SVG_PATH = Path("public/eats/Выпечка.svg")
OUT_DIR = Path("public/eats")
OUT_SIZE = 512  # output square size
QUALITY = 95

print("Reading SVG...")
content = SVG_PATH.read_text(encoding="utf-8")

# Images use xlink:href, format: <image x="0" y="0" width="2065" xlink:href="data:image/png;base64,..." height="3098" .../>
# Find each base64 blob by splitting on the marker
marker = 'xlink:href="data:image/png;base64,'
parts = content.split(marker)
print(f"Found {len(parts) - 1} embedded images")

raw_images = []
for i in range(1, len(parts)):
    # base64 data ends at the next quote
    end_idx = parts[i].find('"')
    b64 = parts[i][:end_idx]
    raw_images.append(b64)

# SVG has 86 images: first 43 are shadow/mask layers, second 43 are actual food photos.
# Take only the second half (indices 43-85), no dedup needed.
food_images = raw_images[43:]
print(f"Food images (second half): {len(food_images)}")

# Create circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

for idx, b64_data in enumerate(food_images):
    num = idx + 1
    fname = f"eat-{num:02d}.webp"

    # Decode base64
    raw = base64.b64decode(b64_data)
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    iw, ih = img.size

    # Crop to center square
    side = min(iw, ih)
    left = (iw - side) // 2
    top = (ih - side) // 2
    img = img.crop((left, top, left + side, top + side))

    # Resize to output size with high quality
    img = img.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)

    # Apply circular mask
    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)

    # Save as webp
    out_path = OUT_DIR / fname
    result.save(str(out_path), "WEBP", quality=QUALITY)
    print(f"  {fname} ({iw}x{ih} -> {OUT_SIZE}x{OUT_SIZE})")

print(f"\nDone! Extracted {len(food_images)} food images to {OUT_DIR}/")
