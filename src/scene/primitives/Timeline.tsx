import type { SceneObject } from "../registry";
import { Panel } from "./Panel";

export function TimelinePrimitive({ object }: { object: SceneObject }) {
  const items = object.items ?? [];
  return (
    <Panel object={object} accent="#3ddc84">
      {items.map((_, index) => (
        <mesh key={index} position={[-0.4 + index * 0.26, 0, 0.05]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#3ddc84" emissive="#145c38" />
        </mesh>
      ))}
    </Panel>
  );
}