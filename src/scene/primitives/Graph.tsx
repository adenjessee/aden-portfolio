import { Html } from "@react-three/drei";
import type { SceneObject } from "../registry";
import { worldPosition } from "./positions";

const nodes = [
  { id: "app", x: -0.35, y: 0.25 },
  { id: "graph", x: 0.2, y: 0.3 },
  { id: "hiddenDependency", x: 0.15, y: -0.15 },
  { id: "tests", x: -0.25, y: -0.2 },
];

export function GraphPrimitive({ object, highlight }: { object: SceneObject; highlight: string | null }) {
  return (
    <group position={worldPosition(object.position)}>
      {nodes.map((node) => (
        <mesh key={node.id} position={[node.x, node.y, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color={highlight === node.id || node.id === "hiddenDependency" && highlight === "hiddenDependency" ? "#ff5a6a" : "#28e1ff"}
            emissive={highlight === node.id ? "#ff5a6a" : "#145866"}
          />
        </mesh>
      ))}
      <mesh>
        <boxGeometry args={[1.05, 0.82, 0.02]} />
        <meshStandardMaterial color="#071018" transparent opacity={0.55} />
      </mesh>
      <Html position={[0, 0.48, 0]} center>
        <div className="chip">{object.title || "graph"}</div>
      </Html>
    </group>
  );
}
