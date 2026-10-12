import type { Viseme } from "../voice/visemes";
import type { ExpressionController } from "./ExpressionController";

export type MouthSource = { mouth(): { viseme: Viseme; weight: number } };

/** Eases the mouth toward whatever the speech source says, so shapes blend instead of snapping. */
export class LipSync {
  private viseme: Viseme = "aa";
  private weight = 0;

  update(expression: ExpressionController, source: MouthSource | undefined, delta: number): void {
    const target = source?.mouth() ?? { viseme: this.viseme, weight: 0 };
    if (target.viseme !== this.viseme && target.weight > 0.05) {
      // Close slightly through a shape change rather than jumping between two open shapes.
      this.weight *= 0.5;
      this.viseme = target.viseme;
    }
    const rate = target.weight > this.weight ? 28 : 16;
    this.weight += (target.weight - this.weight) * Math.min(1, delta * rate);
    expression.setViseme(this.viseme, this.weight);
  }
}
