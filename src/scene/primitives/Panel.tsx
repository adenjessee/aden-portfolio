import type { ReactNode } from "react";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

export function Panel({
  object,
  accent = "#28e1ff",
  children,
}: {
  object: SceneObject;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <group position={worldPosition(object.position)}>
      <mesh>
        <boxGeometry args={[1.15, 0.86, 0.03]} />
        <meshStandardMaterial color="#071018" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.42, 0.02]}>
        <boxGeometry args={[1.15, 0.03, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
      {children}
    </group>
  );
}
