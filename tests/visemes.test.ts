import { describe, expect, it } from "vitest";
import { alignmentToVisemes, amplitudeToViseme } from "../src/voice/alignmentToVisemes";

describe("lip sync", () => {
  it("maps vowels to VRM visemes", () => {
    const frames = alignmentToVisemes({
      chars: ["h", "e", "l", "l", "o"],
      charStartTimesMs: [0, 40, 80, 120, 160],
      charDurationsMs: [40, 40, 40, 40, 80],
    });
    expect(frames.some((frame) => frame.viseme === "ee")).toBe(true);
    expect(frames.some((frame) => frame.viseme === "oh")).toBe(true);
  });

  it("falls back from amplitude", () => {
    expect(amplitudeToViseme(0).weight).toBe(0);
    expect(amplitudeToViseme(0.3).viseme).toBe("ee");
  });
});
