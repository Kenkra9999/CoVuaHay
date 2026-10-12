"""Encode existing artwork for fast delivery; originals and alpha stay intact.

Requires Pillow. Run from the repository root after updating the PNG artwork.
"""
from pathlib import Path
from PIL import Image

artwork = list(Path("public/boards/vip").glob("*.png")) + [
    Path("public/chess-duel.png"), Path("public/chess-becoming.png")
]
original_bytes = encoded_bytes = 0
for source in artwork:
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.save(target, "WEBP", quality=84, method=6)
    original_bytes += source.stat().st_size
    encoded_bytes += target.stat().st_size
print(f"{len(artwork)} images: {original_bytes:,} → {encoded_bytes:,} bytes")
