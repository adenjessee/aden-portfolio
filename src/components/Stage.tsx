import { useEffect, useRef, useState, type ComponentType } from "react";
import { askAden, type AskEvent } from "../client/askClient";
import type { HistoryTurn } from "../director/prompt";
import { detectCapability } from "../avatar/capability";
import { emptyScene } from "../scene/registry";
import type { DirectorOutput } from "../scene/schema";
import { SpeechPlayer } from "../voice/player";

type Row = { id: number; question: string; summary: string; state: "thinking" | "speaking" | "done" | "error"; speech: string };

const LOG_LINES = 7;
const IDLE: DirectorOutput["performance"] = { emotion: "neutral", gesture: "idle", lookAt: "visitor" };
const THINKING: DirectorOutput["performance"] = { emotion: "thinking", gesture: "think", lookAt: "visitor" };

type CanvasProps = {
  performance: DirectorOutput["performance"];
  scene: ReturnType<typeof emptyScene>;
  talking: boolean;
  voice?: SpeechPlayer;
};

/**
 * The whole /ask page: the avatar fills the screen, and one input sits at the bottom with a short
 * log above it. Answers are spoken; the log shows what was asked and the gist of each answer.
 */
export default function Stage() {
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [pose, setPose] = useState(IDLE);
  const [question, setQuestion] = useState("");
  const [caption, setCaption] = useState("");
  const [announce, setAnnounce] = useState("");
  const player = useRef<SpeechPlayer | null>(null);
  const turns = useRef<HistoryTurn[]>([]);
  const inflight = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    player.current = new SpeechPlayer();
    if (!detectCapability().canLoad3d) {
      setNoWebgl(true);
      return;
    }
    let cancelled = false;
    void import("../avatar/AvatarCanvas").then((mod) => {
      if (!cancelled) setCanvas(() => mod.AvatarCanvas as ComponentType<CanvasProps>);
    });
    const prefill = new URLSearchParams(window.location.search).get("q");
    if (prefill) setQuestion(prefill.slice(0, 500));
    input.current?.focus();
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(id: number, change: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  }

  async function send() {
    const text = question.trim();
    if (!text) return;
    // Inside the key press, so the browser lets the audio play.
    player.current?.unlock();
    // A new question interrupts the current answer, the way it would in conversation.
    inflight.current?.abort();
    player.current?.stop();
    const controller = new AbortController();
    inflight.current = controller;

    const id = nextId.current++;
    setQuestion("");
    setCaption("");
    setPose(THINKING);
    setRows((current) => [...current, { id, question: text, summary: "", state: "thinking", speech: "" } as Row].slice(-LOG_LINES));
    const history = turns.current.slice(-8);
    turns.current.push({ role: "visitor", text });

    let voiced = false;
    await askAden(
      text,
      history,
      (event: AskEvent) => {
        if (controller.signal.aborted) return;
        if (event.type === "voice") voiced = true;
        if (event.type === "audio") {
          player.current?.enqueue(event.audio, event.sampleRate, event.index, event.alignment);
          patch(id, { state: "speaking" });
          setPose((current) => (current === THINKING ? IDLE : current));
        }
        if (event.type === "voice_error") voiced = false;
        if (event.type === "answer") {
          turns.current.push({ role: "aden", text: event.output.speech });
          patch(id, { summary: event.summary, speech: event.output.speech, state: player.current?.speaking ? "speaking" : "done" });
          setPose(event.output.performance);
          setAnnounce(event.output.speech);
          // No voice (no key, budget spent, or the voice failed): show the words instead.
          if (!voiced || !player.current?.speaking) setCaption(event.output.speech);
          const wait = (player.current?.remaining ?? 0) * 1000;
          window.setTimeout(() => {
            if (!controller.signal.aborted) patch(id, { state: "done" });
          }, wait + 200);
        }
        if (event.type === "error") patch(id, { state: "error", summary: event.message });
      },
      { voice: true, signal: controller.signal },
    );
  }

  return (
    <div className="stage">
      <div className="stage-avatar" aria-hidden="true">
        {Canvas ? (
          <Canvas performance={pose} scene={emptyScene()} talking={false} voice={player.current ?? undefined} />
        ) : noWebgl ? (
          <img className="stage-poster" src="/avatar-poster.svg" alt="" />
        ) : null}
      </div>

      <div className="stage-dock">
        {caption ? <p className="stage-caption">{caption}</p> : null}
        <ol className="stage-log" aria-label="Conversation">
          {rows.map((row, index) => (
            <li key={row.id} data-state={row.state} style={{ opacity: 0.35 + (0.65 * (index + 1)) / rows.length }} title={row.speech || undefined}>
              <span className="stage-q">{row.question}</span>
              <span className="stage-a">
                {row.state === "thinking" ? "thinking…" : row.state === "speaking" && !row.summary ? "speaking…" : row.summary || "answered"}
              </span>
            </li>
          ))}
        </ol>
        <form
          className="stage-input"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor="stage-q" className="sr-only">
            Ask Aden
          </label>
          <textarea
            id="stage-q"
            ref={input}
            rows={1}
            value={question}
            maxLength={500}
            placeholder="Ask Aden anything"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" aria-label="Send" disabled={!question.trim()}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
