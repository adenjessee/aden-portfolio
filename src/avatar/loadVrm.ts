import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import type { Material, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** First match wins: your own export, then the sample model. */
export const VRM_CANDIDATES = ["/models/aden.vrm", "/models/placeholder.vrm"];

// Emissive parts of the model (suit lines) are pushed past the bloom threshold so they glow.
const GLOW = 2.4;

type Emissive = Material & { emissiveMap?: unknown; emissiveIntensity?: number };

function boostEmissive(vrm: VRM): void {
  vrm.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of ([] as Material[]).concat(mesh.material)) {
      const m = material as Emissive;
      if (m.emissiveMap && typeof m.emissiveIntensity === "number") m.emissiveIntensity *= GLOW;
    }
  });
}

export async function loadVrm(url: string, onProgress?: (fraction: number) => void): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url, (event) => {
    if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
  });
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error("VRM missing from glTF userData");
  // VRM 0.x models face -Z and VRM 1.0 models face +Z; this turns only the 0.x ones toward the camera.
  VRMUtils.rotateVRM0(vrm);
  boostEmissive(vrm);
  onProgress?.(1);
  return vrm;
}

/** Whether a model file exists, without downloading it. Avoids a failed 10 MB request per visit. */
export async function firstAvailable(urls: string[]): Promise<string[]> {
  const checks = await Promise.all(urls.map((url) => fetch(url, { method: "HEAD" }).then((r) => r.ok, () => false)));
  return urls.filter((_, i) => checks[i]);
}
