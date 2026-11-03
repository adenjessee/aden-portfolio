import sys
from PIL import Image
S = sys.argv[1]
pairs = [("IMG_1639", "front"), ("IMG_1640", "threequarter"), ("IMG_1641", "profile_left"), ("IMG_1642", "profile_right")]
def on_grey(im, size):
    im = im.convert("RGBA"); bbox = im.getbbox(); im = im.crop(bbox)
    im.thumbnail(size); bg = Image.new("RGBA", size, (128, 128, 128, 255))
    bg.alpha_composite(im, ((size[0]-im.width)//2, size[1]-im.height)); return bg
W, H = 450, 600
sheet = Image.new("RGBA", (W*4, H*2), (128,128,128,255))
for i, (p, r) in enumerate(pairs):
    sheet.alpha_composite(on_grey(Image.open(f"{S}/cut/{p}-small.png"), (W, H)), (i*W, 0))
    sheet.alpha_composite(on_grey(Image.open(f"{S}/render/head_{r}.png"), (W, H)), (i*W, H))
sheet.convert("RGB").save(f"{S}/compare_head.png")
body = Image.new("RGBA", (300*5, 600), (128,128,128,255))
for i, r in enumerate(["front","threequarter","profile_left","profile_right","back"]):
    body.alpha_composite(on_grey(Image.open(f"{S}/render/body_{r}.png"), (300, 600)), (i*300, 0))
body.convert("RGB").save(f"{S}/compare_body.png")
