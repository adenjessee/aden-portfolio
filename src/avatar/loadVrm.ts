import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadVrm(url: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error("VRM missing from glTF userData");
  vrm.scene.rotation.y = Math.PI;
  return vrm;
}

export const VRM_CANDIDATES = ["/models/aden.vrm", "/models/placeholder.vrm"];
