import type { SceneObject } from "../registry";
import { Panel } from "./Panel";

export function TextPrimitive({ object }: { object: SceneObject }) {
  return <Panel object={object} />;
}
