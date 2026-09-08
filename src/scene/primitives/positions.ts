import type { SceneObject } from "../registry";

export function worldPosition(position: SceneObject["position"]): [number, number, number] {
  switch (position) {
    case "avatarLeft":
      return [-1.55, 1.25, 0.15];
    case "avatarRight":
      return [1.55, 1.25, 0.15];
    case "above":
      return [0, 2.15, 0.1];
    default:
      return [0, 1.45, 0.55];
  }
}
