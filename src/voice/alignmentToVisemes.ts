export const visemes = ["aa", "ih", "ou", "ee", "oh"] as const;
export type Viseme = (typeof visemes)[number];

const MAP: Record<string, Viseme> = {
  a: "aa",
  e: "ee",
  i: "ih",
  o: "oh",
  u: "ou",
  y: "ih",
};

export type Alignment = {
  chars?: string[];
  charStartTimesMs?: number[];
  charDurationsMs?: number[];
};

export type VisemeFrame = {
  atMs: number;
  durationMs: number;
  viseme: Viseme;
  weight: number;
};

export function alignmentToVisemes(alignment: Alignment | undefined): VisemeFrame[] {
  if (!alignment?.chars || !alignment.charStartTimesMs || !alignment.charDurationsMs) return [];
  const frames: VisemeFrame[] = [];
  for (let i = 0; i < alignment.chars.length; i += 1) {
    const char = alignment.chars[i].toLowerCase();
    const viseme = MAP[char];
    if (!viseme) continue;
    frames.push({
      atMs: alignment.charStartTimesMs[i] ?? 0,
      durationMs: Math.max(alignment.charDurationsMs[i] ?? 80, 40),
      viseme,
      weight: 0.85,
    });
  }
  return smooth(frames);
}

function smooth(frames: VisemeFrame[]): VisemeFrame[] {
  return frames.map((frame, index) => {
    const prev = frames[index - 1];
    const next = frames[index + 1];
    if (prev && next && prev.viseme === next.viseme && prev.viseme !== frame.viseme) {
      return { ...frame, weight: 0.45 };
    }
    return frame;
  });
}

export function amplitudeToViseme(amplitude: number): { viseme: Viseme; weight: number } {
  const weight = Math.min(1, Math.max(0, amplitude) * 1.4);
  if (weight < 0.08) return { viseme: "aa", weight: 0 };
  if (weight < 0.35) return { viseme: "ih", weight };
  if (weight < 0.6) return { viseme: "ee", weight };
  return { viseme: "aa", weight };
}
