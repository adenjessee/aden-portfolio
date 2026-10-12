import type { VRM } from "@pixiv/three-vrm";
import { gestures, type Performance } from "../scene/schema";

export type Gesture = Performance["gesture"];

type BoneName = "rightUpperArm" | "leftUpperArm" | "rightLowerArm" | "leftLowerArm" | "spine" | "head" | "rightHand" | "leftHand";

// Arms relaxed at the sides. Every gesture is an offset from this, so "idle" is a person, not a T-pose.
const REST: Partial<Record<BoneName, [number, number, number]>> = {
  leftUpperArm: [0, 0, -1.2],
  rightUpperArm: [0, 0, 1.2],
  leftLowerArm: [0, 0, -0.12],
  rightLowerArm: [0, 0, 0.12],
};

const POSES: Record<Gesture, Partial<Record<BoneName, [number, number, number]>>> = {
  idle: {},
  talk_neutral: { rightLowerArm: [-0.4, 0, 0.2], leftLowerArm: [-0.3, 0, -0.15] },
  talk_excited: { rightUpperArm: [-0.5, 0, 0.4], leftUpperArm: [-0.4, 0, -0.3] },
  think: { rightUpperArm: [-1.1, 0.2, 0.4], rightLowerArm: [-1.4, 0, 0], head: [0.15, 0.2, 0] },
  look_left: { head: [0, 0.45, 0] },
  look_right: { head: [0, -0.45, 0] },
  point_left: { leftUpperArm: [-0.8, 0.4, -0.6], leftLowerArm: [-0.2, 0, 0] },
  point_right: { rightUpperArm: [-0.8, -0.4, 0.6], rightLowerArm: [-0.2, 0, 0] },
  point_up: { rightUpperArm: [-2.1, 0, 0.2] },
  shrug: { rightUpperArm: [0, 0, 0.7], leftUpperArm: [0, 0, -0.7] },
  cross_arms: { rightUpperArm: [-0.7, -0.5, 0.2], leftUpperArm: [-0.7, 0.5, -0.2] },
  hands_together: { rightUpperArm: [-0.6, -0.3, 0], leftUpperArm: [-0.6, 0.3, 0] },
  explain_small: { rightLowerArm: [-0.8, 0, 0.3] },
  explain_large: { rightUpperArm: [-0.9, 0, 0.7], leftUpperArm: [-0.8, 0, -0.6] },
  laugh: { spine: [0.12, 0, 0], head: [0.2, 0, 0] },
  disagree: { head: [0, -0.25, 0] },
  nod: { head: [0.25, 0, 0] },
};

export class AnimationController {
  private current: Gesture = "idle";
  private target: Gesture = "idle";
  private mix = 1;
  private time = 0;

  get gesture(): Gesture {
    return this.target;
  }

  play(gesture: Gesture): void {
    if (!gestures.includes(gesture)) return;
    if (gesture === this.target) return;
    this.current = this.target;
    this.target = gesture;
    this.mix = 0;
  }

  update(vrm: VRM, delta: number): void {
    this.time += delta;
    this.mix = Math.min(1, this.mix + delta / 0.28);
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const from = POSES[this.current];
    const to = POSES[this.target];
    const names = new Set([...Object.keys(REST), ...Object.keys(from), ...Object.keys(to)]) as Set<BoneName>;

    for (const name of names) {
      const node = humanoid.getNormalizedBoneNode(name);
      if (!node) continue;
      const a = from[name] ?? [0, 0, 0];
      const b = to[name] ?? [0, 0, 0];
      const rest = REST[name] ?? [0, 0, 0];
      const sway = name === "spine" ? Math.sin(this.time * 1.4) * 0.02 : 0;
      node.rotation.x = rest[0] + lerp(a[0], b[0], this.mix) + sway;
      node.rotation.y = rest[1] + lerp(a[1], b[1], this.mix);
      node.rotation.z = rest[2] + lerp(a[2], b[2], this.mix);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
