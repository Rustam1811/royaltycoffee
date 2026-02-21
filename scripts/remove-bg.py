"""
Remove background from all drink photos using rembg (AI).
Overwrites originals with transparent-background versions.
"""
import os
import sys
from pathlib import Path
from rembg import remove
from PIL import Image
import io

DRINKS_DIR = Path(__file__).parent.parent / "public" / "drinks"

def process_image(filepath: Path):
    """Remove background from a single image."""
    with open(filepath, "rb") as f:
        input_data = f.read()

    output_data = remove(input_data)

    # Save as PNG with transparency
    img = Image.open(io.BytesIO(output_data)).convert("RGBA")
    img.save(filepath, "PNG", optimize=True)

    old_kb = len(input_data) / 1024
    new_kb = os.path.getsize(filepath) / 1024
    return old_kb, new_kb

def main():
    files = sorted(DRINKS_DIR.glob("*.png"))
    print(f"🎨 Removing backgrounds from {len(files)} images in {DRINKS_DIR}\n")

    total_saved = 0
    for i, f in enumerate(files, 1):
        print(f"  [{i:2d}/{len(files)}] {f.name} ... ", end="", flush=True)
        try:
            old_kb, new_kb = process_image(f)
            saved = old_kb - new_kb
            total_saved += saved
            print(f"✅  {old_kb:.0f}KB → {new_kb:.0f}KB  (saved {saved:.0f}KB)")
        except Exception as e:
            print(f"❌  {e}")

    print(f"\n🎊 Done! Total saved: {total_saved/1024:.1f} MB")

if __name__ == "__main__":
    main()
