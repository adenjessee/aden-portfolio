import { amplitudeToViseme, alignmentToVisemes, type Alignment, type Viseme } from "../voice/alignmentToVisemes";
import type { ExpressionController } from "./ExpressionController";

export class LipSync {
  private frames = alignmentToVisemes(undefined);
  private startedAt = 0;
  private analyser: AnalyserNode | null = null;
  private bins = new Uint8Array(32);

  loadAlignment(alignment: Alignment | undefined): void {
    this.frames = alignmentToVisemes(alignment);
    this.startedAt = performance.now();
  }

  attachAnalyser(analyser: AnalyserNode): void {
    this.analyser = analyser;
  }

  update(expression: ExpressionController): void {
    const elapsed = performance.now() - this.startedAt;
    const frame = this.frames.find((item) => elapsed >= item.atMs && elapsed <= item.atMs + item.durationMs);
    if (frame) {
      expression.setViseme(frame.viseme, frame.weight);
      return;
    }

    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.bins);
      let sum = 0;
      for (const value of this.bins) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const { viseme, weight } = amplitudeToViseme(Math.sqrt(sum / this.bins.length));
      expression.setViseme(viseme, weight);
      return;
    }

    expression.setViseme("aa" as Viseme, 0);
  }
}
