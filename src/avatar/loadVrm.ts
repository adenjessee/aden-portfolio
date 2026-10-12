import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadVrm(url: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error("VRM missing from glTF userData");
  // VRM 0.x models face -Z and VRM 1.0 models face +Z; this turns only the 0.x ones toward the camera.
  VRMUtils.rotateVRM0(vrm);
  return vrm;
}

export const VRM_CANDIDATES = ["/models/aden.vrm", "/models/placeholder.vrm"];
