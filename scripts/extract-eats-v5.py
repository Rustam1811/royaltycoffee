#!/usr/bin/env python3
"""
Extract food images with burgundy background.
1. Extract transforms for each food image from SVG
2. Decode base64 PNGs
3. Apply inverse transform to crop the visible portion
4. Composite: burgundy circle + food photo + circular mask
"""
import re, base64, io, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("pip install Pillow")

SVG_PATH = Path("public/eats/Выпечка.svg")
OUT_DIR = Path("public/eats")
OUT_SIZE = 512
QUALITY = 95
BURGUNDY = (121, 35, 17)  # #792311
CIRCLE_SVG = 64  # circle diameter in SVG units

print("Reading SVG...")
content = SVG_PATH.read_text(encoding="utf-8")

# Extract base64 data for all 86 images
marker = 'xlink:href="data:image/png;base64,'
raw_images = []
for part in content.split(marker)[1:]:
    end = part.find('"')
    raw_images.append(part[:end])

print(f"Total images: {len(raw_images)}")
# Food images are the second 43
food_b64 = raw_images[43:]
print(f"Food images: {len(food_b64)}")

# Extract the matrix transform that immediately precedes each food image
# Pattern: transform="matrix(sx, 0, 0, sy, tx, ty)"> ... <image ...
# Find positions of all 86 <image tags
img_positions = [m.start() for m in re.finditer(r'<image\s', content)]
food_img_positions = img_positions[43:]  # second half

transforms = []
for pos in food_img_positions:
    # Look backward for the nearest matrix transform
    chunk = content[max(0, pos - 500):pos]
    mats = re.findall(r'transform="matrix\(([^"]+)\)"', chunk)
    if mats:
        last_mat = mats[-1]
        parts = [float(x.strip()) for x in last_mat.split(",")]
        sx, _, _, sy, tx, ty = parts
        transforms.append((sx, sy, tx, ty))
    else:
        transforms.append(None)

print(f"Transforms found: {sum(1 for t in transforms if t)}/{len(transforms)}")

# Show first few for debug
for i in range(min(5, len(transforms))):
    print(f"  #{i+1}: {transforms[i]}")

# Create circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

for idx in range(len(food_b64)):
    num = idx + 1
    fname = f"eat-{num:02d}.webp"

    # Decode original PNG
    raw = base64.b64decode(food_b64[idx])
    src = Image.open(io.BytesIO(raw)).convert("RGBA")
    iw, ih = src.size

    t = transforms[idx]
    if t is None:
        # Fallback: center crop
        side = min(iw, ih)
        left = (iw - side) // 2
        top = (ih - side) // 2
        crop = src.crop((left, top, left + side, top + side))
    else:
        sx, sy, tx, ty = t
        # The SVG circle is [0, CIRCLE_SVG] x [0, CIRCLE_SVG]
        # Transform maps image coords to SVG local:
        #   svg_x = sx * img_x + tx
        #   svg_y = sy * img_y + ty
        # Inverse: img_x = (svg_x - tx) / sx
        # Visible SVG area: [0, CIRCLE_SVG]
        img_x0 = max(0, (0 - tx) / sx)
        img_x1 = min(iw, (CIRCLE_SVG - tx) / sx)
        img_y0 = max(0, (0 - ty) / sy)
        img_y1 = min(ih, (CIRCLE_SVG - ty) / sy)
        crop = src.crop((int(img_x0), int(img_y0), int(img_x1), int(img_y1)))

    # Now create the output:
    # 1. Burgundy circle background
    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    bg = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (*BURGUNDY, 255))
    result.paste(bg, (0, 0), mask)

    # 2. Compute where the food goes within the circle
    if t is not None:
        sx, sy, tx, ty = t
        # Position of crop within the circle:
        # The crop starts at img_x0, img_y0 in image space
        # In SVG space that's: svg_x = sx * img_x0 + tx, svg_y = sy * img_y0 + ty
        svg_crop_x0 = sx * max(0, (0 - tx) / sx) + tx
        svg_crop_y0 = sy * max(0, (0 - ty) / sy) + ty
        svg_crop_x1 = sx * min(iw, (CIRCLE_SVG - tx) / sx) + tx
        svg_crop_y1 = sy * min(ih, (CIRCLE_SVG - ty) / sy) + ty

        # Map SVG coords to output pixels
        px_x0 = int(svg_crop_x0 / CIRCLE_SVG * OUT_SIZE)
        px_y0 = int(svg_crop_y0 / CIRCLE_SVG * OUT_SIZE)
        px_x1 = int(svg_crop_x1 / CIRCLE_SVG * OUT_SIZE)
        px_y1 = int(svg_crop_y1 / CIRCLE_SVG * OUT_SIZE)

        target_w = px_x1 - px_x0
        target_h = px_y1 - px_y0
        if target_w > 0 and target_h > 0:
            food_resized = crop.resize((target_w, target_h), Image.LANCZOS)
            # Paste onto result with mask clipping
            # Create a temp with the food placed correctly
            temp = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
            temp.paste(food_resized, (px_x0, px_y0))
            # Apply circular mask to temp
            temp_masked = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
            temp_masked.paste(temp, (0, 0), mask)
            # Composite food over burgundy bg
            result = Image.alpha_composite(result, temp_masked)
    else:
        food_resized = crop.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        food_masked = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
        food_masked.paste(food_resized, (0, 0), mask)
        result = Image.alpha_composite(result, food_masked)

    # Final circular clip
    final = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    final.paste(result, (0, 0), mask)

    out_path = OUT_DIR / fname
    final.save(str(out_path), "WEBP", quality=QUALITY)
    print(f"  {fname} ({iw}x{ih})")

print(f"\nDone! {len(food_b64)} images -> {OUT_DIR}/")
