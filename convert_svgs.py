import os
import re
import io
import time
from PIL import Image
import resvg_py

def slugify(name: str) -> str:
    base = os.path.splitext(name)[0]
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', base).strip('-').lower()
    return slug + '.webp'

def main():
    src_dir = r'R:\flip book dev\flip-book-studio\src\assets\New Pgs'
    out_dir = r'R:\flip book dev\flip-book-studio\src\assets'
    
    files = [f for f in os.listdir(src_dir) if f.endswith('.svg')]
    files.sort()
    
    print(f"Starting conversion of {len(files)} SVG files...")
    
    results = []
    for idx, fname in enumerate(files, 1):
        in_path = os.path.join(src_dir, fname)
        out_name = slugify(fname)
        out_path = os.path.join(out_dir, out_name)
        
        t0 = time.time()
        print(f"[{idx}/{len(files)}] Converting '{fname}' -> '{out_name}'...", end=" ", flush=True)
        try:
            with open(in_path, 'r', encoding='utf-8') as f:
                svg_data = f.read()
            
            png_bytes = resvg_py.svg_to_bytes(svg_data)
            img = Image.open(io.BytesIO(png_bytes))
            # Save as webp with good quality and fast method
            img.save(out_path, 'WEBP', quality=85, method=3)
            
            elapsed = time.time() - t0
            out_size = os.path.getsize(out_path)
            print(f"DONE in {elapsed:.2f}s ({img.size[0]}x{img.size[1]}, {out_size/1024:.1f} KB)")
            results.append((fname, out_name, img.size, out_size, True, None))
        except Exception as e:
            print(f"FAILED: {e}")
            results.append((fname, out_name, None, 0, False, str(e)))
            
    print("\nConversion Summary:")
    for r in results:
        status = "OK" if r[4] else f"ERR: {r[5]}"
        print(f" - {r[0]} -> {r[1]}: {status}")

if __name__ == '__main__':
    main()
