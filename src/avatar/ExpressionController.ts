import type { VRM } from "@pixiv/three-vrm";
import type { Performance } from "../scene/schema";
import type { Viseme } from "../voice/visemes";

const EMOTION_MAP: Record<Performance["emotion"], Record<string, number>> = {
  neutral: {},
  interested: { happy: 0.25 },
  skeptical: { angry: 0.2 },
  amused: { happy: 0.55 },
  excited: { happy: 0.7, surprised: 0.15 },
  concerned: { sad: 0.35 },
  confused: { surprised: 0.3 },
  thinking: { relaxed: 0.25 },
  serious: { angry: 0.08 },
};

export class ExpressionController {
  private emotion: Performance["emotion"] = "neutral";
  private viseme: Viseme = "aa";
  private visemeWeight = 0;
  private blink = 0;

  setEmotion(emotion: Performance["emotion"]): void {
    this.emotion = emotion;
  }

  setViseme(viseme: Viseme, weight: number): void {
    this.viseme = viseme;
    this.visemeWeight = weight;
  }

  update(vrm: VRM, delta: number, elapsed: number): void {
    const manager = vrm.expressionManager;
    if (!manager) return;

    for (const name of ["happy", "angry", "sad", "relaxed", "surprised", "aa", "ih", "ou", "ee", "oh", "blink"] as const) {
      manager.setValue(name, 0);
    }

    const weights = EMOTION_MAP[this.emotion];
    for (const [name, value] of Object.entries(weights)) {
      manager.setValue(name, value);
    }
    manager.setValue(this.viseme, this.visemeWeight);

    this.blink = Math.sin(elapsed * 0.7) > 0.96 ? 1 : Math.max(0, this.blink - delta * 8);
    manager.setValue("blink", this.blink);
  }
}
