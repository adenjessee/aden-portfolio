/**
 * Mixamo FBX -> VRM animation notes.
 *
 * Mixamo downloads require an Adobe login, so this repo does not vendor clips.
 * Place FBX files in raw-animations/, then:
 *
 *   npm run retarget-mixamo
 *
 * The runtime does not depend on VRMA files. AnimationController poses the
 * VRM humanoid with a gesture vocabulary. Drop .vrma files in public/animations
 * when you have them; loadVrm stays on the same bone contract.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const incoming = join(new URL("..", import.meta.url).pathname, "raw-animations");

if (!existsSync(incoming)) {
  console.log("No raw-animations/ directory. Create it and drop Mixamo FBX files.");
  console.log("Until then the avatar uses the procedural FSM in src/avatar/AnimationController.ts.");
  process.exit(0);
}

const files = readdirSync(incoming).filter((name) => name.endsWith(".fbx"));
if (files.length === 0) {
  console.log("raw-animations/ is empty. Procedural gestures remain the v1 path.");
  process.exit(0);
}

console.log(`Found ${files.length} FBX file(s). Convert with Blender + VRM addon or UniVRM, export VRMA, copy to public/animations/.`);
for (const file of files) console.log(` - ${file}`);
