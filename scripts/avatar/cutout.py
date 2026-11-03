import sys
import Vision, Quartz
from Foundation import NSURL
src, out, bg = sys.argv[1], sys.argv[2], sys.argv[3]
img = Quartz.CIImage.imageWithContentsOfURL_(NSURL.fileURLWithPath_(src))
orient = img.properties().get("Orientation", 1)
img = img.imageByApplyingCGOrientation_(int(orient))
img = img.imageByApplyingTransform_(Quartz.CGAffineTransformMakeTranslation(-img.extent().origin.x, -img.extent().origin.y))
handler = Vision.VNImageRequestHandler.alloc().initWithCIImage_options_(img, {})
req = Vision.VNGenerateForegroundInstanceMaskRequest.alloc().init()
ok, err = handler.performRequests_error_([req], None)
obs = req.results()[0]
buf, err = obs.generateScaledMaskForImageForInstances_fromRequestHandler_error_(obs.allInstances(), handler, None)
mask = Quartz.CIImage.imageWithCVPixelBuffer_(buf)
if bg == "none":
    back = Quartz.CIImage.imageWithColor_(Quartz.CIColor.colorWithRed_green_blue_alpha_(0, 0, 0, 0))
else:
    h = int(bg, 16)
    back = Quartz.CIImage.imageWithColor_(Quartz.CIColor.colorWithRed_green_blue_(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255))
back = back.imageByCroppingToRect_(img.extent())
f = Quartz.CIFilter.filterWithName_("CIBlendWithMask")
f.setValue_forKey_(img, "inputImage"); f.setValue_forKey_(back, "inputBackgroundImage"); f.setValue_forKey_(mask, "inputMaskImage")
ctx = Quartz.CIContext.context()
cs = Quartz.CGColorSpaceCreateWithName(Quartz.kCGColorSpaceSRGB)
ok, err = ctx.writePNGRepresentationOfImage_toURL_format_colorSpace_options_error_(f.outputImage(), NSURL.fileURLWithPath_(out), Quartz.kCIFormatRGBA8, cs, {}, None)
print("ok" if ok else err, out)
