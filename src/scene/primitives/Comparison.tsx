import { Html } from "@react-three/drei";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

export function ComparisonPrimitive({ object }: { object: SceneObject }) {
  return (
    <group position={worldPosition(object.position)}>
      <Html center transform distanceFactor={2.4}>
        <div className="cards" style={{ width: 360, gridTemplateColumns: "1fr 1fr" }}>
          <article className="card">
            <p className="meta">{object.left?.title}</p>
            <p>{object.left?.body}</p>
          </article>
          <article className="card">
            <p className="meta">{object.right?.title}</p>
            <p>{object.right?.body}</p>
          </article>
        </div>
      </Html>
    </group>
  );
}
