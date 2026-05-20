#!/usr/bin/env python3
"""
Analyze the transform chain for one food image in the SVG 
to understand how the food photo maps into the circle.
"""
import re

with open("public/eats/Выпечка.svg", "r") as f:
    c = f.read()

# Find the structure around the first food image (second half, index 43)
marker = 'xlink:href="data:image/png;base64,'
parts = c.split(marker)

# The food images start at index 44 (1-based), so parts[44]
# But let's look at the context around image #44 (first food image)
# Find the position of the 44th occurrence
pos = 0
for i in range(44):
    pos = c.find(marker, pos) + len(marker)

# Go back 3000 chars to see the enclosing structure
start = max(0, pos - 3000)
context = c[start:pos]

# Find all <g> tags and transforms
print("=== Context before 44th image (first food photo) ===")
# Show the transforms and structure
g_opens = [(m.start(), m.group(0)) for m in re.finditer(r'<g\s[^>]+>', context)]
for offset, tag in g_opens[-15:]:
    print(f"  {tag[:200]}")

# Also show the image tag attributes
img_attrs_end = c.find('"', pos)  # end of base64, but we want attrs before href
# Go back to the <image tag
img_tag_start = c.rfind('<image', 0, pos)
img_tag = c[img_tag_start:img_tag_start + 300]
# Remove base64 data
img_tag_clean = re.sub(r'xlink:href="data:image/png;base64,[^"]*"', 'xlink:href="[BASE64]"', img_tag)
print(f"\nImage tag: {img_tag_clean[:300]}")

# Now look at what clip-path is used
clip_match = re.search(r'clip-path="url\(#([^)]+)\)"', context[-500:])
if clip_match:
    clip_id = clip_match.group(1)
    print(f"\nClip-path used: {clip_id}")
    # Find this clipPath definition
    clip_def = re.search(rf'<clipPath id="{clip_id}"[^>]*>(.*?)</clipPath>', c, re.DOTALL)
    if clip_def:
        print(f"Clip definition: {clip_def.group(1).strip()[:300]}")

# Also look at the FIRST image (shadow, index 0) context
pos1 = c.find(marker) + len(marker)
start1 = max(0, pos1 - 3000)
context1 = c[start1:pos1]
print("\n=== Context before 1st image (shadow) ===")
g_opens1 = [(m.start(), m.group(0)) for m in re.finditer(r'<g\s[^>]+>', context1)]
for offset, tag in g_opens1[-15:]:
    print(f"  {tag[:200]}")

img_tag_start1 = c.rfind('<image', 0, pos1)
img_tag1 = c[img_tag_start1:img_tag_start1+300]
img_tag1_clean = re.sub(r'xlink:href="data:image/png;base64,[^"]*"', 'xlink:href="[BASE64]"', img_tag1)
print(f"\nImage tag: {img_tag1_clean[:300]}")
