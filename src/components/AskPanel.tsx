import { lazy, Suspense, useState } from "react";
import type { DirectorOutput } from "../scene/schema";
import Conversation from "./Conversation";
import { ErrorBoundary } from "./ErrorBoundary";

const AvatarIsland = lazy(() => import("../avatar/AvatarIsland"));

const poster = (
  <div className="poster">
    <img src="/avatar-poster.svg" alt="Stylized portrait of Aden Jessee" width="640" height="720" />
  </div>
);

export default function AskPanel() {
  const [live, setLive] = useState<DirectorOutput | null>(null);

  return (
    <div className="ask-grid">
      <div className="ask-stage">
        <ErrorBoundary fallback={poster}>
          <Suspense fallback={poster}>
            <AvatarIsland live={live ? { performance: live.performance, sceneCommands: live.scene, talking: true } : undefined} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <Conversation onLive={setLive} />
    </div>
  );
}
