import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useEffect, useRef, useState } from "react";
import type { VRM } from "@pixiv/three-vrm";
import type { DirectorOutput } from "../scene/schema";
import type { SceneState } from "../scene/registry";
import { SceneObjects } from "../scene/primitives/SceneObjects";
import { AnimationController } from "./AnimationController";
import { ExpressionController } from "./ExpressionController";
import { GazeController } from "./GazeController";
import { LipSync, type MouthSource } from "./LipSync";
import { loadVrm, VRM_CANDIDATES } from "./loadVrm";

type Props = {
  performance: DirectorOutput["performance"];
  scene: SceneState;
  talking: boolean;
  /** Speech currently playing; drives the mouth. */
  voice?: MouthSource & { speaking: boolean };
};

function AdenRig({ performance, talking, voice }: { performance: DirectorOutput["performance"]; talking: boolean; voice?: Props["voice"] }) {
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
            // Dev only: lets a test read the live mouth weights from the console.
            if (import.meta.env.DEV) (window as unknown as { __avatar?: VRM }).__avatar = loaded;
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
    if (voice) anim.current.play(voice.speaking ? (performance.gesture === "idle" ? "talk_neutral" : performance.gesture) : performance.gesture === "think" ? "think" : "idle");
    anim.current.update(vrm, delta);
    lips.current.update(face.current, voice, delta);
    face.current.update(vrm, delta, state.clock.elapsedTime);
    vrm.update(delta);
  });

  // Nothing while the model downloads; a stand-in shape would just flash and vanish.
  if (!vrm) return null;

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
  // Head about a third of the way down the frame, chest at the bottom edge behind the input dock.
  const target = new Vector3(0, headPos.y - 0.18, 0);
  camera.position.set(0, headPos.y - 0.1, 1.9);
  camera.lookAt(target);
}

export function AvatarCanvas({ performance, scene, talking, voice }: Props) {
  return (
    <Canvas camera={{ position: [0, 1.35, 2.6], fov: 32 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
      <color attach="background" args={["#02060c"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} color="#d7f6ff" />
      <spotLight position={[-2, 4, 2]} intensity={0.6} color="#28e1ff" />
      <AdenRig performance={performance} talking={talking} voice={voice} />
      <SceneObjects scene={scene} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#071018" />
      </mesh>
    </Canvas>
  );
}

