import type { SceneObject } from "../registry";
import { Panel } from "./Panel";

export function CodePrimitive({ object }: { object: SceneObject }) {
  return (
    <Panel object={object}>
      {[0.18, 0.06, -0.06, -0.18].map((y) => (
        <mesh key={y} position={[0, y, 0.04]}>
          <boxGeometry args={[0.82, 0.04, 0.01]} />
          <meshStandardMaterial color="#28e1ff" />
        </mesh>
      ))}
    </Panel>
  );
}
