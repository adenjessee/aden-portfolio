export type Capability = {
  webgl: boolean;
  reducedMotion: boolean;
  lowMemory: boolean;
  linkedIn: boolean;
  canLoad3d: boolean;
};

export function detectCapability(): Capability {
  if (typeof window === "undefined") {
    return { webgl: false, reducedMotion: true, lowMemory: true, linkedIn: false, canLoad3d: false };
  }

  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 2;
  const linkedIn = /LinkedInApp|LinkedIn/i.test(navigator.userAgent);
  const canLoad3d = webgl && !reducedMotion && !lowMemory && !linkedIn;

  return { webgl, reducedMotion, lowMemory, linkedIn, canLoad3d };
}
