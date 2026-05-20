#!/usr/bin/env python3
"""
Extract food images with burgundy background - v6.
Uses SVG transform data to correctly position food within burgundy circles.
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
BURGUNDY = (121, 35, 17, 255)  # #792311
CIRCLE_SVG = 64  # circle diameter in SVG

print("Reading SVG...")
content = SVG_PATH.read_text(encoding="utf-8")

# 1. Extract base64 food images (second 43 of 86)
marker = 'xlink:href="data:image/png;base64,'
all_b64 = []
for part in content.split(marker)[1:]:
    all_b64.append(part[:part.find('"')])
food_b64 = all_b64[43:]
print(f"Food images: {len(food_b64)}")

# 2. Extract the scaling transform for each food image
img_starts = [m.start() for m in re.finditer(r'<image\s', content)]
food_starts = img_starts[43:]

food_transforms = []
for pos in food_starts:
    chunk = content[max(0, pos - 3000):pos]
    mats = re.findall(r'transform="matrix\(([^"]+)\)"', chunk)
    
    # Find the innermost transform with sx ~ 0.03 (the scaling one)
    scaling_t = None
    for mat_str in reversed(mats):
        parts = [float(x.strip()) for x in mat_str.split(",")]
        sx = parts[0]
        if 0.01 < sx < 0.1:  # scaling transform
            scaling_t = (parts[0], parts[3], parts[4], parts[5])  # sx, sy, tx, ty
            break
    food_transforms.append(scaling_t)

# 3. Circle positions in SVG coordinates
ROW_YS = [11, 83, 155, 228, 300, 372, 444, 516, 589, 661, 733]
COL_XS = [4, 83, 163, 242]
circle_positions = []
for row_idx, y in enumerate(ROW_YS):
    cols = 4 if row_idx < 10 else 3
    for col_idx in range(cols):
        circle_positions.append((COL_XS[col_idx], y))

print(f"Circles: {len(circle_positions)}")

# 4. Match each food image to its circle by proximity of transform (tx, ty)
def find_circle(tx, ty):
    """Find the circle position closest to the transform origin. Returns (cx, cy, index)."""
    best_idx = 0
    best_dist = float("inf")
    for i, (cx, cy) in enumerate(circle_positions):
        dist = abs(tx - cx) + abs(ty - cy)
        if dist < best_dist:
            best_dist = dist
            best_idx = i
    cx, cy = circle_positions[best_idx]
    return cx, cy, best_idx

# Create circular mask
mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([0, 0, OUT_SIZE - 1, OUT_SIZE - 1], fill=255)

# Track which circles have been filled
filled = {}

for idx in range(len(food_b64)):
    t = food_transforms[idx]
    if t is None:
        print(f"  [skip] #{idx+1} - no transform found")
        continue
    
    sx, sy, tx, ty = t
    
    # Decode image
    raw = base64.b64decode(food_b64[idx])
    src = Image.open(io.BytesIO(raw)).convert("RGBA")
    iw, ih = src.size
    
    # Find which circle this image belongs to
    cx, cy = find_circle(tx, ty)
    
    # Local transform within the circle
    local_tx = tx - cx
    local_ty = ty - cy
    
    # What portion of the original image is visible in the circle [0, 64] x [0, 64] local?
    # local_svg_x = sx * img_x + local_tx  →  img_x = (local_svg_x - local_tx) / sx
    img_x0 = max(0, (0 - local_tx) / sx)
    img_x1 = min(iw, (CIRCLE_SVG - local_tx) / sx)
    img_y0 = max(0, (0 - local_ty) / sy)
    img_y1 = min(ih, (CIRCLE_SVG - local_ty) / sy)
    
    if img_x1 <= img_x0 or img_y1 <= img_y0:
        print(f"  [skip] #{idx+1} - bad crop region")
        continue
    
    # Crop the visible part
    crop = src.crop((int(img_x0), int(img_y0), int(img_x1), int(img_y1)))
    
    # Where does this crop go in the output 512x512?
    out_x0 = int(max(0, local_tx + sx * img_x0) / CIRCLE_SVG * OUT_SIZE)
    out_y0 = int(max(0, local_ty + sy * img_y0) / CIRCLE_SVG * OUT_SIZE)
    out_x1 = int(min(CIRCLE_SVG, local_tx + sx * img_x1) / CIRCLE_SVG * OUT_SIZE)
    out_y1 = int(min(CIRCLE_SVG, local_ty + sy * img_y1) / CIRCLE_SVG * OUT_SIZE)
    
    target_w = out_x1 - out_x0
    target_h = out_y1 - out_y0
    
    if target_w < 10 or target_h < 10:
        print(f"  [skip] #{idx+1} - target too small ({target_w}x{target_h})")
        continue
    
    # Resize crop to target area
    food_resized = crop.resize((target_w, target_h), Image.LANCZOS)
    
    # Replace black background with burgundy using flood-fill from edges
    # This only affects the background area (connected to edges), not the plate
    import numpy as np
    from collections import deque
    
    arr = np.array(food_resized)
    h_px, w_px = arr.shape[:2]
    
    # Create a visited mask  
    visited = np.zeros((h_px, w_px), dtype=bool)
    is_dark = (arr[:,:,0].astype(int) + arr[:,:,1].astype(int) + arr[:,:,2].astype(int)) < 80
    
    # Seed from all edge pixels that are dark
    queue = deque()
    for x in range(w_px):
        for y in [0, h_px - 1]:
            if is_dark[y, x] and not visited[y, x]:
                queue.append((y, x))
                visited[y, x] = True
    for y in range(h_px):
        for x in [0, w_px - 1]:
            if is_dark[y, x] and not visited[y, x]:
                queue.append((y, x))
                visited[y, x] = True
    
    # BFS flood fill
    while queue:
        cy, cx = queue.popleft()
        arr[cy, cx] = [BURGUNDY[0], BURGUNDY[1], BURGUNDY[2], 255]
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h_px and 0 <= nx < w_px and not visited[ny, nx] and is_dark[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    
    food_resized = Image.fromarray(arr)
    
    # Build result: burgundy circle + food with burgundy bg
    result = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    # Burgundy background
    bg = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), BURGUNDY)
    result.paste(bg, (0, 0), mask)
    
    # Place food
    food_layer = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    food_layer.paste(food_resized, (out_x0, out_y0))
    # Clip food to circle
    food_clipped = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    food_clipped.paste(food_layer, (0, 0), mask)
    
    # Composite
    result = Image.alpha_composite(result, food_clipped)
    
    # Determine output number by circle position
    ci = circle_positions.index((cx, cy))
    num = ci + 1
    
    if num in filled:
        # Skip duplicate
        continue
    filled[num] = True
    
    fname = f"eat-{num:02d}.webp"
    out_path = OUT_DIR / fname
    result.save(str(out_path), "WEBP", quality=QUALITY)
    print(f"  {fname} circle=({cx},{cy}) local_t=({local_tx:.1f},{local_ty:.1f})")

# Check for missing circles
for i in range(1, 44):
    if i not in filled:
        print(f"  [MISSING] eat-{i:02d}.webp")

print(f"\nDone! {len(filled)} images -> {OUT_DIR}/")
