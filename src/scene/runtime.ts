import { applyCommands, emptyScene, type SceneState } from "./registry";
import { safeParseDirectorOutput, type DirectorOutput, type SceneCommand } from "./schema";

export function interpretScene(commands: SceneCommand[], previous = emptyScene()): SceneState {
  return applyCommands(previous, commands);
}

export function interpretDirector(raw: unknown, previous = emptyScene()): {
  output: DirectorOutput | null;
  scene: SceneState;
  error: string | null;
} {
  const parsed = safeParseDirectorOutput(raw);
  if (!parsed.ok) {
    return { output: null, scene: previous, error: parsed.error };
  }
  return {
    output: parsed.value,
    scene: interpretScene(parsed.value.scene, previous),
    error: null,
  };
}
