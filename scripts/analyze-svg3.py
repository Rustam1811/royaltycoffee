#!/usr/bin/env python3
"""
Analyze transform chain for EACH food image to find the correct inner transform.
"""
import re

with open("public/eats/Выпечка.svg", "r") as f:
    c = f.read()

# Find all 86 <image positions
img_starts = [m.start() for m in re.finditer(r'<image\s', c)]
food_starts = img_starts[43:]  # second half = food

print(f"Food images: {len(food_starts)}")

for i, pos in enumerate(food_starts[:10]):
    # Look back for matrix transforms - find ALL within 2000 chars
    chunk = c[max(0, pos - 2000):pos]
    mats = re.findall(r'transform="matrix\(([^"]+)\)"', chunk)
    
    # Find image width
    img_chunk = c[pos:pos + 200]
    w_m = re.search(r'width="(\d+)"', img_chunk)
    iw = int(w_m.group(1)) if w_m else 0
    
    print(f"\n#{i+1} (img_w={iw}):")
    for j, mat in enumerate(mats):
        parts = [float(x.strip()) for x in mat.split(",")]
        sx, _, _, sy, tx, ty = parts
        scaled_w = sx * iw if iw else 0
        print(f"  mat[{j}]: sx={sx:.6f} sy={sy:.6f} tx={tx:.2f} ty={ty:.2f}  -> img_w_scaled={scaled_w:.1f}")
