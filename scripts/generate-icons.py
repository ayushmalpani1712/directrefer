"""Generate all DirectRefer icon sizes from the original logo-emblem.png.

Uses logo-emblem.png as the single source of truth.
Generates: website logo, PWA icons (192, 512), apple-touch-icon, favicons, .ico
All using LANCZOS resampling for smooth edges.
Supersample approach: render at 4x, apply minimal blur to soften
raster aliasing, then downscale to target for clean anti-aliased edges.
"""
from PIL import Image, ImageFilter
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public')


def load_source():
    src = Image.open(os.path.join(BASE, 'logo-emblem.png')).convert('RGBA')
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    return src


def smooth_resize(source_img, target_w, target_h):
    """Supersample at 4x then downscale with LANCZOS for smooth edges."""
    sup = 4
    big = source_img.resize((target_w * sup, target_h * sup), Image.LANCZOS)
    # Very subtle blur at supersampled resolution to smooth raster aliasing
    big = big.filter(ImageFilter.GaussianBlur(radius=0.6))
    return big.resize((target_w, target_h), Image.LANCZOS)


def make_icon(source_img, target_size, padding_pct=12):
    pad = int(target_size * padding_pct / 100)
    available = target_size - 2 * pad
    src_w, src_h = source_img.size
    scale = min(available / src_w, available / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    resized = smooth_resize(source_img, new_w, new_h)
    canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    x = (target_size - new_w) // 2
    y = (target_size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    trimmed = load_source()
    src_w, src_h = trimmed.size
    print(f'Source (trimmed): {src_w}x{src_h}')

    # Website logo: 512px wide, preserving aspect ratio
    logo_w = 512
    logo_h = int(src_h * logo_w / src_w)
    logo_512 = smooth_resize(trimmed, logo_w, logo_h)
    logo_512.save(os.path.join(BASE, 'logo-emblem.png'), optimize=True)
    print(f'logo-emblem.png -> {logo_w}x{logo_h}')

    # PWA maskable icon 512x512
    pwa_512 = make_icon(trimmed, 512, padding_pct=12)
    pwa_512.save(os.path.join(BASE, 'pwa-icon.png'), optimize=True)
    print(f'pwa-icon.png -> 512x512')

    # PWA icon 192x192
    pwa_192 = make_icon(trimmed, 192, padding_pct=12)
    pwa_192.save(os.path.join(BASE, 'pwa-icon-192.png'), optimize=True)
    print(f'pwa-icon-192.png -> 192x192')

    # Apple touch icon 180x180
    apple_180 = make_icon(trimmed, 180, padding_pct=12)
    apple_180.save(os.path.join(BASE, 'apple-touch-icon.png'), optimize=True)
    print(f'apple-touch-icon.png -> 180x180')

    # Favicons
    favicon_32 = make_icon(trimmed, 32, padding_pct=8)
    favicon_32.save(os.path.join(BASE, 'favicon-32x32.png'), optimize=True)
    print(f'favicon-32x32.png -> 32x32')

    favicon_16 = make_icon(trimmed, 16, padding_pct=8)
    favicon_16.save(os.path.join(BASE, 'favicon-16x16.png'), optimize=True)
    print(f'favicon-16x16.png -> 16x16')

    # Multi-size .ico
    ico_images = []
    for size in [16, 32, 48]:
        ico_images.append(make_icon(trimmed, size, padding_pct=8))
    ico_images[0].save(
        os.path.join(BASE, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=ico_images[1:],
    )
    print(f'favicon.ico -> 16/32/48')

    print('Done.')


if __name__ == '__main__':
    main()
