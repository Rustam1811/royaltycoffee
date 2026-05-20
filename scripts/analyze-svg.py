#!/usr/bin/env python3
"""Analyze SVG structure to find burgundy circle positions and sizes."""
import re

with open("public/eats/Выпечка.svg", "r") as f:
    c = f.read()

# Find all uses of #792311 (burgundy circles)
indices = [m.start() for m in re.finditer(r'fill="#792311"', c)]
print(f"Found {len(indices)} burgundy circles")

for i, idx in enumerate(indices):
    # Search backward for enclosing <g> with transform
    start = max(0, idx - 2000)
    chunk = c[start:idx + 500]
    
    # Find all matrix transforms in the chunk
    transforms = re.findall(r'transform="matrix\(([^"]+)\)"', chunk)
    
    # Get the path data associated with this fill
    # Look ahead for the path that uses clip
    path_match = re.search(r'd="([^"]{10,200})"', c[idx:idx + 1000])
    
    t_str = ""
    if transforms:
        # The outer transform gives position
        t = transforms[-2] if len(transforms) >= 2 else transforms[-1]
        parts = [float(x.strip()) for x in t.split(",")]
        tx, ty = parts[4], parts[5]
        t_str = f"x={tx:.0f} y={ty:.0f}"
    
    path_info = ""
    if path_match:
        d = path_match.group(1)
        # Extract bounds from path
        nums = re.findall(r'[\d.]+', d)
        if len(nums) >= 4:
            path_info = f"path_size~{float(nums[2]):.0f}x{float(nums[3]):.0f}" if float(nums[2]) > 10 else ""
    
    print(f"  {i+1}: {t_str} {path_info}")

# Also get clipPath circle details
clips = re.findall(r'<clipPath id="([^"]+)"[^>]*>(.*?)</clipPath>', c, re.DOTALL)
circle_clips = []
for cid, body in clips:
    # Check if it's a circular path (contains C curves)
    if "C " in body and "Z" in body:
        circle_clips.append(cid)

print(f"\nCircular clipPaths: {len(circle_clips)}")

# Get the path data for a circle clip to find radius
for cid, body in clips[:6]:
    body = body.strip()
    if "C " in body:
        # Parse the path to estimate circle size
        nums = [float(x) for x in re.findall(r'[\d.]+', body)]
        if nums:
            min_x = min(nums[::2][:20]) if len(nums) > 2 else 0
            max_x = max(nums[::2][:20]) if len(nums) > 2 else 0
            print(f"  clip {cid}: x_range={min_x:.1f}-{max_x:.1f} (width~{max_x-min_x:.1f})")
