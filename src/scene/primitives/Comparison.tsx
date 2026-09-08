import type { SceneObject } from "../registry";
import { Panel } from "./Panel";

export function ComparisonPrimitive({ object }: { object: SceneObject }) {
  return (
    <Panel object={object} accent="#ffb32b">
      <mesh position={[-0.28, 0, 0.04]}>
        <boxGeometry args={[0.42, 0.55, 0.02]} />
        <meshStandardMaterial color="#10203a" />
      </mesh>
      <mesh position={[0.28, 0, 0.04]}>
        <boxGeometry args={[0.42, 0.55, 0.02]} />
        <meshStandardMaterial color="#10203a" />
      </mesh>
    </Panel>
  );
}
