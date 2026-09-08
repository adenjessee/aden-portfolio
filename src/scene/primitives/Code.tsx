import { Html } from "@react-three/drei";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

export function CodePrimitive({ object }: { object: SceneObject }) {
  return (
    <group position={worldPosition(object.position)}>
      <Html center transform distanceFactor={2.6}>
        <pre className="card mono" style={{ width: 280, whiteSpace: "pre-wrap", fontSize: 12 }}>
          {object.title ? `${object.title}\n` : ""}
          {object.code}
        </pre>
      </Html>
    </group>
  );
}
