"""Renders the Netlik mark (assets/brand/logo.svg) into the app icon, splash, favicon,
Android adaptive icon layers and the web app icons.

    python3 scripts/build-brand-assets.py      (needs Pillow)

Geometry on a 100-unit grid: ring centre (50, 50), radius 30, stroke 14 with round caps,
a 50° gap centred at the top right (-70°..-20°), and a dot of radius 9 at (55.7, 44.3).
"""
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
CLAY = (194, 96, 63, 255)  # #C2603F
IVORY = (245, 244, 238, 255)  # #F5F4EE
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling


def mark(size, color, scale=1.0, background=None, radius=0.0):
    """The mark centred on a size×size canvas; `scale` is the ring's outer diameter / size."""
    s = size * SS
    img = Image.new('RGBA', (s, s), background or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if background and radius:
        img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius * s, fill=background)
    # Outer diameter of the ring is 2 * (30 + 7) = 74 units.
    u = scale * s / 74
    cx = cy = s / 2
    r, w = 30 * u, 14 * u
    start, end = -20, 290  # degrees, clockwise on screen
    d.arc((cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2), start, end, fill=color, width=round(w))
    for a in (start, end):  # round caps
        x, y = cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=color)
    dx, dy, dr = cx + 5.7 * u, cy - 5.7 * u, 9 * u
    d.ellipse((dx - dr, dy - dr, dx + dr, dy + dr), fill=color)
    return img.resize((size, size), Image.LANCZOS)


def save(img, *path, rgb=False):
    out = os.path.join(ASSETS, *path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    (img.convert('RGB') if rgb else img).save(out, optimize=True)


icon = mark(1024, IVORY, scale=0.56, background=CLAY)
save(icon, 'icon.png', rgb=True)
save(mark(1024, CLAY, scale=0.9), 'splash-icon.png')
save(mark(48, IVORY, scale=0.62, background=CLAY, radius=0.22), 'favicon.png')
save(Image.new('RGBA', (1024, 1024), CLAY), 'android-icon-background.png')
save(mark(1024, IVORY, scale=0.42), 'android-icon-foreground.png')
save(mark(1024, WHITE, scale=0.42), 'android-icon-monochrome.png')
for name, size in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
    save(icon.resize((size, size), Image.LANCZOS), 'pwa', name, rgb=True)
save(mark(512, IVORY, scale=0.45, background=CLAY), 'pwa', 'maskable-512.png', rgb=True)
print('brand assets written')
