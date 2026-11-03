import { useEffect, useRef, useState } from "react";
import { askAden, fetchStatus, type AskEvent } from "../client/askClient";
import { stripAudioTags } from "@elevenlabs/client";
import { summarize } from "../director/wire";
import { LiveCall, LiveUnavailable } from "../voice/liveCall";
import { BrowserListener, ServerListener, SttFallback, type Listener } from "../voice/listeners";
import type { HistoryTurn } from "../director/prompt";
import { emptyScene } from "../scene/registry";
import type { DirectorOutput } from "../scene/schema";
import { SpeechPlayer } from "../voice/player";
import { useAvatarCanvas } from "./useAvatarCanvas";

type Row = { id: number; question: string; summary: string; state: "thinking" | "speaking" | "done" | "error"; speech: string };

const LOG_LINES = 7;
const IDLE: DirectorOutput["performance"] = { emotion: "neutral", gesture: "idle", lookAt: "visitor" };
const THINKING: DirectorOutput["performance"] = { emotion: "thinking", gesture: "think", lookAt: "visitor" };

/**
 * The whole /ask page: the avatar fills the screen, and one input sits at the bottom with a short
 * log above it. Answers are spoken; the log shows what was asked and the gist of each answer.
 */
export default function Stage() {
  const { Canvas, noWebgl } = useAvatarCanvas();
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
  const listener = useRef<Listener | null>(null);
  const [mic, setMic] = useState<"off" | "idle" | "listening" | "transcribing" | "connecting" | "live">("off");
  const live = useRef<LiveCall | null>(null);
  const liveRow = useRef<number | null>(null);
  const [level, setLevel] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    player.current = new SpeechPlayer();
    void fetchStatus().then((status) => {
      const canRecord = typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
      const preferServer = status?.stt === "elevenlabs" && canRecord;
      listener.current = preferServer ? new ServerListener() : BrowserListener.available() ? new BrowserListener() : canRecord ? new ServerListener() : null;
      if (status?.liveCall && canRecord) live.current = new LiveCall();
      setMic(live.current || listener.current ? "idle" : "off");
    });
    const prefill = new URLSearchParams(window.location.search).get("q");
    if (prefill) setQuestion(prefill.slice(0, 500));
    input.current?.focus();
  }, []);

  function patch(id: number, change: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  }

  /** A live call: full-duplex voice with the agent. Talk, pause, it answers; talk over it and it stops. */
  async function toggleLive() {
    const call = live.current!;
    if (call.active) {
      await call.end();
      return;
    }
    player.current?.stop();
    inflight.current?.abort();
    setMic("connecting");
    try {
      await call.start({
        onUserSaid: (text) => {
          const id = nextId.current++;
          liveRow.current = id;
          setRows((current) => [...current, { id, question: text, summary: "", state: "thinking", speech: "" } as Row].slice(-LOG_LINES));
        },
        onAgentSaid: (raw) => {
          // The voice model's delivery cues ("[excited]") shape how it sounds, not what it says.
          const text = stripAudioTags(raw).replace(/\s+/g, " ").trim();
          const id = liveRow.current;
          setAnnounce(text);
          if (id === null) return; // the greeting: nothing was asked yet
          setRows((current) =>
            current.map((row) => (row.id === id ? { ...row, summary: summarize(text), speech: row.speech ? `${row.speech} ${text}` : text, state: "speaking" } : row)),
          );
        },
        onMode: (mode) => {
          if (mode === "listening" && liveRow.current !== null) {
            const id = liveRow.current;
            setRows((current) => current.map((row) => (row.id === id && row.state !== "thinking" ? { ...row, state: "done" } : row)));
          }
        },
        onEnded: () => {
          liveRow.current = null;
          setMic("idle");
          setLevel(0);
        },
      });
      setMic("live");
      const tick = () => {
        if (!call.active) return;
        setLevel(call.speaking ? 0 : call.inputLevel());
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (error) {
      // No live calls right now (not set up, budget, visit limit): fall back to push-to-talk.
      if (error instanceof LiveUnavailable) live.current = null;
      setMic(listener.current ? "idle" : "off");
      if (error instanceof LiveUnavailable && listener.current) void toggleMic();
    }
  }

  /** Talking interrupts the avatar, like it would in conversation; a pause ends the question. */
  async function toggleMic() {
    if (live.current) return toggleLive();
    if (mic === "listening") {
      listener.current?.stop();
      return;
    }
    if (mic !== "idle" || !listener.current) return;
    player.current?.unlock();
    player.current?.stop();
    inflight.current?.abort();
    setMic("listening");
    setQuestion("");
    const hear = (l: Listener) =>
      l.listen({
        onLevel: setLevel,
        onPartial: (text) => setQuestion(text),
      });
    try {
      let text: string;
      try {
        const pending = hear(listener.current);
        if (listener.current.kind === "server") pending.then(() => undefined, () => undefined);
        text = await pending.then((t) => {
          if (listener.current?.kind === "server") setMic("transcribing");
          return t;
        });
      } catch (error) {
        // The server cannot transcribe (no permission yet, or the day's budget is spent): use the browser.
        if (!(error instanceof SttFallback) || !BrowserListener.available()) throw error;
        listener.current = new BrowserListener();
        text = await hear(listener.current);
      }
      setMic("idle");
      if (text.trim()) await send(text);
      else setQuestion("");
    } catch {
      setMic(listener.current ? "idle" : "off");
    }
  }

  async function send(spoken?: string) {
    const text = (spoken ?? question).trim();
    if (!text) return;
    if (live.current?.active) {
      // In a call, typing is just another way to talk.
      setQuestion("");
      const id = nextId.current++;
      liveRow.current = id;
      setRows((current) => [...current, { id, question: text, summary: "", state: "thinking", speech: "" } as Row].slice(-LOG_LINES));
      live.current.send(text);
      return;
    }
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
          <Canvas
            performance={pose}
            scene={emptyScene()}
            talking={false}
            voice={(mic === "live" ? live.current : player.current) ?? undefined}
            onLoadProgress={setLoaded}
          />
        ) : noWebgl ? (
          <img className="stage-poster" src="/avatar-poster.svg" alt="" />
        ) : null}
      </div>

      {Canvas && loaded < 1 ? (
        <div className="stage-loading" role="progressbar" aria-label="Loading avatar" aria-valuenow={Math.round(loaded * 100)}>
          <span style={{ transform: `scaleX(${loaded})` }} />
        </div>
      ) : null}

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
            placeholder={
              mic === "live" ? "Live: just talk, or type" : mic === "connecting" ? "Connecting…" : mic === "listening" ? "Listening…" : mic === "transcribing" ? "One moment…" : "Ask Aden anything"
            }
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && mic === "listening") listener.current?.cancel();
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          {mic !== "off" ? (
            <button
              type="button"
              className="stage-mic"
              data-state={mic}
              aria-label={mic === "live" ? "End the call" : mic === "listening" ? "Stop listening" : live.current ? "Start a live conversation" : "Talk"}
              aria-pressed={mic === "listening" || mic === "live"}
              onClick={() => void toggleMic()}
              disabled={mic === "transcribing" || mic === "connecting"}
              style={{ ["--level" as string]: level.toFixed(2) }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <button type="submit" aria-label="Send" disabled={!question.trim() || mic === "listening"}>
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
