import type { SceneState } from "../registry";
import { CodePrimitive } from "./Code";
import { ComparisonPrimitive } from "./Comparison";
import { GraphPrimitive } from "./Graph";
import { TextPrimitive } from "./Text";
import { TimelinePrimitive } from "./Timeline";

export function SceneObjects({ scene }: { scene: SceneState }) {
  return (
    <group>
      {scene.objects.map((object) => {
        switch (object.kind) {
          case "graph":
            return <GraphPrimitive key={object.id} object={object} highlight={scene.highlight} />;
          case "comparison":
            return <ComparisonPrimitive key={object.id} object={object} />;
          case "code":
            return <CodePrimitive key={object.id} object={object} />;
          case "text":
            return <TextPrimitive key={object.id} object={object} />;
          case "timeline":
            return <TimelinePrimitive key={object.id} object={object} />;
          default:
            return <TextPrimitive key={object.id} object={{ ...object, text: object.title || object.id }} />;
        }
      })}
    </group>
  );
}
