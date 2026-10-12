import { useEffect, useState, type ComponentType } from "react";
import { detectCapability } from "../avatar/capability";
import type { SceneState } from "../scene/registry";
import type { DirectorOutput } from "../scene/schema";
import type { SpeechPlayer } from "../voice/player";

export type AvatarCanvasProps = {
  performance: DirectorOutput["performance"];
  scene: SceneState;
  talking: boolean;
  voice?: SpeechPlayer;
  onLoadProgress?: (fraction: number) => void;
};

/**
 * Loads the 3D avatar only on devices that can take it, after the page is interactive. `null` while
 * loading; `noWebgl` tells the page to show the poster instead.
 */
export function useAvatarCanvas(): { Canvas: ComponentType<AvatarCanvasProps> | null; noWebgl: boolean } {
  const [Canvas, setCanvas] = useState<ComponentType<AvatarCanvasProps> | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  useEffect(() => {
    if (!detectCapability().canLoad3d) {
      setNoWebgl(true);
      return;
    }
    let cancelled = false;
    void import("../avatar/AvatarCanvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.AvatarCanvas as ComponentType<AvatarCanvasProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { Canvas, noWebgl };
}
