import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useEffect, useRef, useState } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { DirectorOutput } from "../scene/schema";
import { applyCommands, emptyScene, type SceneState } from "../scene/registry";
import { SceneObjects } from "../scene/primitives/SceneObjects";
import { AnimationController } from "./AnimationController";
import { ExpressionController } from "./ExpressionController";
import { GazeController } from "./GazeController";
import { LipSync } from "./LipSync";
import { loadVrm, VRM_CANDIDATES } from "./loadVrm";

type Props = {
  performance: DirectorOutput["performance"];
  scene: SceneState;
  talking: boolean;
};

function AdenRig({ performance, talking }: { performance: DirectorOutput["performance"]; talking: boolean }) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const anim = useRef(new AnimationController());
  const face = useRef(new ExpressionController());
  const gaze = useRef(new GazeController());
  const lips = useRef(new LipSync());
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of VRM_CANDIDATES) {
        try {
          const loaded = await loadVrm(url);
          if (!cancelled) {
            gaze.current.attach(loaded);
            frameHead(loaded, camera);
            setVrm(loaded);
            return;
          }
        } catch {
          // try next candidate
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    anim.current.play(performance.gesture);
    face.current.setEmotion(performance.emotion);
    gaze.current.lookAt(performance.lookAt);
  }, [performance]);

  useEffect(() => {
    if (talking) anim.current.play(performance.gesture === "idle" ? "talk_neutral" : performance.gesture);
  }, [talking, performance.gesture]);

  useFrame((state, delta) => {
    if (!vrm) return;
    anim.current.update(vrm, delta);
    lips.current.update(face.current);
    face.current.update(vrm, delta, state.clock.elapsedTime);
    vrm.update(delta);
  });

  if (!vrm) {
    return (
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.22, 0.9, 6, 12]} />
        <meshStandardMaterial color="#1b3348" />
      </mesh>
    );
  }

  return <primitive object={vrm.scene} />;
}

/**
 * Frames head to waist from the model's own head bone, so any VRM (a 1.4 m anime model or a 1.9 m
 * commissioned one) lands in the same shot without hand-tuned camera numbers.
 */
function frameHead(vrm: VRM, camera: import("three").Camera) {
  vrm.scene.updateMatrixWorld(true);
  const head = vrm.humanoid?.getNormalizedBoneNode("head");
  if (!head) return;
  const headPos = head.getWorldPosition(new Vector3());
  const target = new Vector3(0, headPos.y - 0.22, 0);
  camera.position.set(0, headPos.y - 0.12, 1.7);
  camera.lookAt(target);
}

export function AvatarCanvas({ performance, scene, talking }: Props) {
  return (
    <Canvas camera={{ position: [0, 1.35, 2.6], fov: 32 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
      <color attach="background" args={["#02060c"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} color="#d7f6ff" />
      <spotLight position={[-2, 4, 2]} intensity={0.6} color="#28e1ff" />
      <AdenRig performance={performance} talking={talking} />
      <SceneObjects scene={scene} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#071018" />
      </mesh>
    </Canvas>
  );
}

export function useScenePlayer() {
  const [scene, setScene] = useState<SceneState>(emptyScene());
  const apply = (output: DirectorOutput) => {
    setScene(applyCommands(emptyScene(), output.scene));
  };
  return { scene, apply, setScene };
}
