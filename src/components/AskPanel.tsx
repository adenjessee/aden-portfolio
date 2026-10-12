import { useRef, useState } from "react";
import { emptyScene } from "../scene/registry";
import type { DirectorOutput } from "../scene/schema";
import { SpeechPlayer } from "../voice/player";
import Conversation from "./Conversation";
import { useAvatarCanvas } from "./useAvatarCanvas";

const IDLE: DirectorOutput["performance"] = { emotion: "neutral", gesture: "idle", lookAt: "visitor" };

/** /inspect: the avatar beside the text conversation, sharing one voice player. */
export default function AskPanel() {
  const { Canvas, noWebgl } = useAvatarCanvas();
  const [pose, setPose] = useState(IDLE);
  const player = useRef<SpeechPlayer | null>(null);
  player.current ??= typeof window === "undefined" ? null : new SpeechPlayer();

  return (
    <div className="ask-grid">
      <div className="ask-stage">
        <div className="avatar-stage">
          {Canvas ? (
            <Canvas performance={pose} scene={emptyScene()} talking={false} voice={player.current ?? undefined} />
          ) : noWebgl ? (
            <div className="poster">
              <img src="/avatar-poster.svg" alt="Stylized portrait of Aden Jessee" width="640" height="720" />
            </div>
          ) : null}
        </div>
      </div>
      <Conversation player={player.current} onLive={(output) => setPose(output.performance)} />
    </div>
  );
}
