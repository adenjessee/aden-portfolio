import type { SceneObject } from "../registry";
import { Panel } from "./Panel";

const nodes = [
  { id: "app", x: -0.32, y: 0.18 },
  { id: "graph", x: 0.22, y: 0.22 },
  { id: "hiddenDependency", x: 0.16, y: -0.16 },
  { id: "tests", x: -0.22, y: -0.18 },
];

const edges: Array<[number, number]> = [
  [0, 1],
  [0, 3],
  [1, 2],
];

export function GraphPrimitive({ object, highlight }: { object: SceneObject; highlight: string | null }) {
  return (
    <Panel object={object}>
      {edges.map(([from, to], index) => {
        const a = nodes[from];
        const b = nodes[to];
        const mid: [number, number, number] = [(a.x + b.x) / 2, (a.y + b.y) / 2, 0.04];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const hot = highlight === "hiddenDependency" && from === 1 && to === 2;
        return (
          <mesh key={`e-${index}`} position={mid} rotation={[0, 0, angle]}>
            <boxGeometry args={[len, 0.012, 0.012]} />
            <meshStandardMaterial color={hot ? "#ff5a6a" : "#28e1ff"} />
          </mesh>
        );
      })}
      {nodes.map((node) => {
        const hot = highlight === node.id || (highlight === "hiddenDependency" && node.id === "hiddenDependency");
        return (
          <mesh key={node.id} position={[node.x, node.y, 0.06]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color={hot ? "#ff5a6a" : "#28e1ff"} emissive={hot ? "#ff5a6a" : "#145866"} />
          </mesh>
        );
      })}
    </Panel>
  );
}
