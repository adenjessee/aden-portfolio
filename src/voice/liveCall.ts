import { VoiceConversation } from "@elevenlabs/client";
import type { Viseme } from "./visemes";

export type LiveHandlers = {
  onUserSaid: (text: string) => void;
  onAgentSaid: (text: string) => void;
  onMode: (mode: "speaking" | "listening") => void;
  onEnded: (reason: string) => void;
};

/** Thrown when the site cannot place a live call (not configured, budget, visit limit). */
export class LiveUnavailable extends Error {}

/**
 * A live, full-duplex voice call with the ElevenLabs agent over WebRTC: it listens, decides when
 * you've finished, answers in Aden's voice, and stops when you talk over it. The avatar's mouth
 * reads the agent's output audio, so it moves exactly when sound comes out.
 */
export class LiveCall {
  private conversation: VoiceConversation | null = null;
  private mode: "speaking" | "listening" = "listening";

  get active(): boolean {
    return this.conversation !== null;
  }

  get speaking(): boolean {
    return this.mode === "speaking";
  }

  async start(handlers: LiveHandlers): Promise<void> {
    const response = await fetch("/api/live", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { token?: string; unavailable?: string; error?: string };
    if (!response.ok || !payload.token) throw new LiveUnavailable(payload.unavailable ?? payload.error ?? "unavailable");

    this.conversation = await VoiceConversation.startSession({
      conversationToken: payload.token,
      connectionType: "webrtc",
      onMessage: ({ message, role }) => (role === "user" ? handlers.onUserSaid(message) : handlers.onAgentSaid(message)),
      onModeChange: ({ mode }) => {
        this.mode = mode;
        handlers.onMode(mode);
      },
      onDisconnect: (details) => {
        this.conversation = null;
        this.mode = "listening";
        handlers.onEnded(details.reason);
      },
      onError: (message) => console.warn("live call:", message),
    });
  }

  /** Typed input during a call goes to the same conversation. */
  send(text: string): void {
    this.conversation?.sendUserMessage(text);
  }

  /** Loudness of the visitor's mic, 0..1, for the button's ring. */
  inputLevel(): number {
    return this.conversation?.getInputVolume() ?? 0;
  }

  async end(): Promise<void> {
    const conversation = this.conversation;
    this.conversation = null;
    await conversation?.endSession();
  }

  /**
   * The mouth shape from the sound itself: overall energy opens the jaw, and where the energy sits
   * in the spectrum picks the shape (low: "oh"/"ou", middle: "aa", high: "ee"/"ih").
   */
  mouth(): { viseme: Viseme; weight: number } {
    if (!this.conversation || this.mode !== "speaking") return { viseme: "aa", weight: 0 };
    const bins = this.conversation.getOutputByteFrequencyData();
    if (!bins.length) return { viseme: "aa", weight: 0 };
    const band = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i < to; i += 1) sum += bins[i];
      return sum / Math.max(1, to - from) / 255;
    };
    const n = bins.length;
    const low = band(1, Math.floor(n * 0.06));
    const mid = band(Math.floor(n * 0.06), Math.floor(n * 0.2));
    const high = band(Math.floor(n * 0.2), Math.floor(n * 0.45));
    const energy = Math.max(low, mid, high);
    if (energy < 0.08) return { viseme: "aa", weight: 0 };
    const weight = Math.min(1, (energy - 0.08) * 2.2);
    if (high > mid && high > low) return { viseme: high > 0.35 ? "ee" : "ih", weight: weight * 0.8 };
    if (low > mid) return { viseme: low > 0.45 ? "oh" : "ou", weight };
    return { viseme: "aa", weight };
  }
}
