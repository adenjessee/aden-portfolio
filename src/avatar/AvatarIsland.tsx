import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { DirectorOutput } from "../scene/schema";
import type { SceneState } from "../scene/registry";
import { emptyScene, applyCommands } from "../scene/registry";
import { landingDemo } from "../demos/landing";
import { detectCapability } from "./capability";

type Cue = (typeof landingDemo.timeline)[number];
type CanvasProps = {
  performance: DirectorOutput["performance"];
  scene: SceneState;
  talking: boolean;
};

const idle: DirectorOutput["performance"] = {
  emotion: "neutral",
  gesture: "idle",
  lookAt: "visitor",
};

export default function AvatarIsland({
  live,
}: {
  live?: { performance: DirectorOutput["performance"]; sceneCommands: DirectorOutput["scene"]; talking?: boolean };
}) {
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [cue, setCue] = useState<Cue>(landingDemo.timeline[0]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const capability = detectCapability();
    if (!capability.canLoad3d) return;
    let cancelled = false;
    void import("./AvatarCanvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.AvatarCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (live || !Canvas) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const current = [...landingDemo.timeline].reverse().find((item) => elapsed >= item.atMs) ?? landingDemo.timeline[0];
      setCue(current);
      setPlaying(elapsed < landingDemo.durationMs);
      if (elapsed >= landingDemo.durationMs) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [live, Canvas]);

  if (!Canvas) {
    return (
      <div className="poster">
        <img src="/avatar-poster.svg" alt="Stylized portrait of Aden Jessee" width="640" height="720" />
      </div>
    );
  }

  const pose = live?.performance ?? cue.performance ?? idle;
  const commands = live?.sceneCommands ?? cue.scene;
  const scene = applyCommands(emptyScene(), commands);

  const caption = sceneCaption(scene);

  return (
    <div>
      <div className="avatar-stage" data-demo={playing ? "on" : "off"}>
        <Canvas performance={pose} scene={scene} talking={Boolean(live?.talking || playing)} />
      </div>
      {caption ? <p className="status scene-caption">{caption}</p> : null}
    </div>
  );
}

function sceneCaption(scene: SceneState): string {
  return scene.objects
    .map((object) => {
      if (object.kind === "text") return object.text;
      if (object.kind === "comparison") return `${object.left?.title} / ${object.right?.title}`;
      if (object.kind === "timeline") return (object.items ?? []).join(" → ");
      if (object.kind === "code") return object.title || "code";
      return object.title || object.id;
    })
    .filter(Boolean)
    .join(" · ");
}
