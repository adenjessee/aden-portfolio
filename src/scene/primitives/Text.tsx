import { Html } from "@react-three/drei";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

export function TextPrimitive({ object }: { object: SceneObject }) {
  return (
    <group position={worldPosition(object.position)}>
      <Html center transform distanceFactor={2.8}>
        <p className="card" style={{ width: 240 }}>
          {object.text}
        </p>
      </Html>
    </group>
  );
}
