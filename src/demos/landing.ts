import raw from "../../content/demos/landing.demo.json";
import type { DirectorOutput, SceneCommand } from "../scene/schema";

export type DemoCue = {
  atMs: number;
  performance: DirectorOutput["performance"];
  scene: SceneCommand[];
};

export const landingDemo = raw as {
  id: string;
  durationMs: number;
  audio: string;
  transcript: string;
  timeline: DemoCue[];
};
