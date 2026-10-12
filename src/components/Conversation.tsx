import { useEffect, useRef, useState } from "react";
import { askAden, fetchStatus, type AnswerEvent, type AskEvent, type Meter } from "../client/askClient";
import { BrowserListener } from "../voice/listeners";
import type { SpeechPlayer } from "../voice/player";
import { limits } from "../config/site";
import type { HistoryTurn } from "../director/prompt";
import { noteHref } from "../rag/provenance";
import type { Provenance } from "../rag/types";
import type { DirectorOutput } from "../scene/schema";
import ActionCard from "./ActionCard";
import TraceMap from "./TraceMap";

type Turn =
  | { role: "visitor"; text: string }
  | { role: "aden"; question: string; pending: boolean; status: string; retrieved: Provenance[]; answer: AnswerEvent | null; error?: string };

const STARTERS = [
  "What do you build?",
  "Why does graph engineering matter if AI can already read a repo?",
  "How do you check what an agent did?",
  "What is GridSchool, and who is it for?",
  "What are you weakest at?",
  "Are you open to new roles?",
];

const STATUS_COPY: Record<string, string> = {
  guard: "Checking limits…",
  retrieve: "Searching my notes…",
  direct: "Writing from the notes it found…",
  assemble: "Assembling from my notes…",
};

const FREE_COPY = {
  no_model: "Notes-only mode: answers are assembled from Aden's notes without a model. Free, and a little stiff.",
  budget_exhausted: "Today's model budget is spent. Answers now come straight from the notes, free, until midnight UTC.",
  session_exhausted: "That was this visit's live questions. Keep asking: answers now come straight from the notes, free.",
} as const;

function money(usd: number): string {
  return usd >= 0.01 ? `$${usd.toFixed(2)}` : usd > 0 ? `$${usd.toFixed(4)}` : "$0";
}

function history(turns: Turn[]): HistoryTurn[] {
  return turns.flatMap<HistoryTurn>((turn) => {
    if (turn.role === "visitor") return [{ role: "visitor", text: turn.text }];
    return turn.answer ? [{ role: "aden", text: turn.answer.output.speech }] : [];
  });
}

export default function Conversation({ onLive, player }: { onLive?: (output: DirectorOutput) => void; player?: SpeechPlayer | null }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [meter, setMeter] = useState<Meter | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  // Detected after mount so the server render and the first client render match.
  const [speech, setSpeech] = useState(false);

  useEffect(() => {
    setSpeech(BrowserListener.available());
    // Links from a note pre-fill the question; the visitor still decides to send it.
    const prefill = new URLSearchParams(window.location.search).get("q");
    if (prefill) setQuestion(prefill.slice(0, 500));
  }, []);

  useEffect(() => {
    void fetchStatus().then((status) => {
      if (!status) return;
      setModel(status.model);
      setMeter({ ...status, freeReason: status.provider === "none" ? "no_model" : status.live ? null : status.spentUsd >= status.ceilingUsd ? "budget_exhausted" : "session_exhausted" });
    });
  }, []);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  function patchLast(patch: (turn: Extract<Turn, { role: "aden" }>) => Extract<Turn, { role: "aden" }>) {
    setTurns((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "aden") next[next.length - 1] = patch(last);
      return next;
    });
  }

  async function submit(raw = question) {
    const text = raw.trim();
    if (!text || busy) return;
    const prior = history(turns);
    player?.unlock();
    player?.stop();
    setQuestion("");
    setBusy(true);
    setTurns((current) => [
      ...current,
      { role: "visitor", text },
      { role: "aden", question: text, pending: true, status: "Searching my notes…", retrieved: [], answer: null },
    ]);
    await askAden(text, prior, (event: AskEvent) => {
      if (event.type === "audio") player?.enqueue(event.audio, event.sampleRate, event.index, event.alignment);
      if (event.type === "status") patchLast((t) => ({ ...t, status: STATUS_COPY[event.value] ?? event.value }));
      if (event.type === "retrieved") patchLast((t) => ({ ...t, retrieved: event.provenance }));
      if (event.type === "error") patchLast((t) => ({ ...t, pending: false, error: event.message }));
      if (event.type === "answer") {
        patchLast((t) => ({ ...t, pending: false, answer: event }));
        setMeter(event.meter);
        if (event.trace.model) setModel(event.trace.model);
        onLive?.(event.output);
      }
    }, { voice: Boolean(player) });
    setBusy(false);
  }

  const remaining = meter ? Math.max(0, meter.questionCap - meter.questionsUsed) : limits.sessionQuestions;

  return (
    <div className="convo">
      <div className="meter" aria-live="polite">
        {meter?.live ? (
          <>
            <span className="dot is-live" /> <span>Live · {model}</span>
            <span className="sep">·</span>
            <span>
              {remaining} of {meter.questionCap} live questions left
            </span>
            <span className="sep">·</span>
            <span>
              {money(meter.spentUsd)} of {money(meter.ceilingUsd)} spent today
            </span>
          </>
        ) : meter ? (
          <>
            <span className="dot" /> <span>{FREE_COPY[meter.freeReason ?? "no_model"]}</span>
          </>
        ) : (
          <span>Connecting…</span>
        )}
      </div>

      <div className="convo-log">
        {turns.length === 0 ? (
          <div className="starters">
            <p className="meta">Try one</p>
            <div className="chips">
              {STARTERS.map((starter) => (
                <button key={starter} className="chip chip-btn" type="button" onClick={() => void submit(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, index) =>
          turn.role === "visitor" ? (
            <div className="turn turn-visitor" key={index}>
              <p>{turn.text}</p>
            </div>
          ) : (
            <AdenTurn key={index} turn={turn} transcript={history(turns.slice(0, index + 1))} onMeter={setMeter} />
          ),
        )}
        <div ref={logEnd} />
      </div>

      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="ask-q" className="sr-only">
          Ask Aden
        </label>
        <textarea
          id="ask-q"
          name="question"
          value={question}
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask about my work, how I build agents, GridSchool, or whether I fit a role."
        />
        <div className="actions">
          <button className="btn btn-solid" type="submit" disabled={busy || !question.trim()}>
            {busy ? "Answering…" : "Ask"}
          </button>
          {speech ? (
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => {
                setListening(true);
                void new BrowserListener()
                  .listen({ onPartial: setQuestion })
                  .then((spoken) => {
                    setListening(false);
                    if (spoken) void submit(spoken);
                  })
                  .catch(() => setListening(false));
              }}
            >
              {listening ? "Listening…" : "Speak"}
            </button>
          ) : null}
          <span className="status">Answers come only from notes Aden wrote. Each one shows its sources.</span>
        </div>
      </form>
    </div>
  );
}

function AdenTurn({ turn, transcript, onMeter }: { turn: Extract<Turn, { role: "aden" }>; transcript: HistoryTurn[]; onMeter: (m: Meter) => void }) {
  const answer = turn.answer;
  const provenance = answer?.provenance ?? turn.retrieved;
  const cited = provenance.filter((p, i) => p.cited && provenance.findIndex((q) => q.cited && q.path === p.path) === i);
  const mock = cited.some((p) => p.status === "mock");

  return (
    <div className="turn turn-aden" data-pending={turn.pending ? "true" : "false"}>
      {turn.error ? (
        <p className="form-error">{turn.error}</p>
      ) : answer ? (
        <>
          {answer.output.noPosition ? <p className="badge badge-none">Not in Aden's notes</p> : null}
          {mock ? <p className="badge badge-mock">Uses a placeholder note Aden has not filled in yet</p> : null}
          <p className="speech">{answer.output.speech}</p>
          {cited.length ? (
            <p className="sources">
              <span className="meta">Sources</span>
              {cited.map((p) => (
                <a key={p.id} className="cite" data-status={p.status} href={noteHref(p.path)} title={p.claim}>
                  {p.title}
                </a>
              ))}
            </p>
          ) : null}
        </>
      ) : (
        <p className="status typing">{turn.status}</p>
      )}
      {!turn.error && (provenance.length > 0 || answer) ? (
        <TraceMap question={turn.question} provenance={provenance} trace={answer?.trace ?? null} threshold={answer?.trace.threshold ?? limits.retrievalThreshold} />
      ) : null}
      {answer?.action ? <ActionCard action={answer.action} transcript={transcript} onMeter={onMeter} /> : null}
    </div>
  );
}
