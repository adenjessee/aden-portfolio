import { Html } from "@react-three/drei";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

export function TimelinePrimitive({ object }: { object: SceneObject }) {
  return (
    <group position={worldPosition(object.position)}>
      <Html center transform distanceFactor={2.5}>
        <ol className="card" style={{ width: 220, paddingLeft: 28 }}>
          {(object.items ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Html>
    </group>
  );
}
