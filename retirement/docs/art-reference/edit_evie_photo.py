import random
from PIL import Image, ImageEnhance, ImageDraw
random.seed(3)
im = Image.open(__import__('sys').argv[1]).convert('RGB')
px = im.load()

# 1. Take out the two pale ticks on the forehead (they read as glare): bright pixels become the
#    skin beside them on the same row.
for (x0, y0, x1, y1, sx) in [(752, 238, 778, 260, 785), (782, 258, 804, 286, 808)]:
    for y in range(y0, y1):
        ref = px[sx, y]
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if r > ref[0] + 5 and r + g + b > sum(ref) + 12:
                j = random.randint(-3, 3)
                px[x, y] = (ref[0] + j, ref[1] + j, ref[2] + j)

# 2. The scar: a pale nick cutting down through her right eyebrow (viewer's left), in steps the
#    size of the face's pixels, the brow broken where it crosses.
d = ImageDraw.Draw(im)
pale = (184, 138, 118)
edge = (98, 64, 52)
steps = [(770, 263), (767, 268), (764, 273), (761, 278), (758, 283)]
for i, (x, y) in enumerate(steps):
    d.rectangle([x, y, x + 4, y + 4], fill=pale)
    # A thin shadow on one side, so it reads as a healed cut, not a highlight.
    d.rectangle([x - 2, y + 2, x - 1, y + 4], fill=edge)
# The brow's broken gap either side of the line, softened to skin.
for (x, y) in [(767, 273), (764, 278), (755, 279)]:
    d.rectangle([x, y, x + 3, y + 3], fill=(150, 108, 88))

# 3. Colour: warmer, brighter daylight; keep the coat blue and the print's age.
im = im.point(lambda v: int(255 * ((v / 255) ** 0.82)))  # lift the midtones
r, g, b = im.split()
r = r.point(lambda v: min(255, int(v * 1.07 + 4)))
g = g.point(lambda v: min(255, int(v * 1.02 + 2)))
b = b.point(lambda v: int(v * 0.95))
im = Image.merge('RGB', (r, g, b))
im = ImageEnhance.Color(im).enhance(1.3)
im = ImageEnhance.Contrast(im).enhance(1.08)
im.save('evie_photo_before.png')
im.crop((640, 200, 900, 420)).resize((780, 660), Image.NEAREST).save('evie_face_after.png')
w, h = im.size
both = Image.new('RGB', (w, h * 2 + 20), (30, 30, 30))
both.paste(Image.open(__import__('sys').argv[1]).convert('RGB'), (0, 0))
both.paste(im, (0, h + 20))
both.resize((w // 2, (h * 2 + 20) // 2)).save('evie_before_after.png')
