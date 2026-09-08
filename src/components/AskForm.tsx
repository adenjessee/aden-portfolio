import { useMemo, useState } from "react";
import { askAden, cachedAnswers, type AskEvent } from "../client/askClient";
import { listenForSpeech } from "../client/audioPlayer";
import type { DirectorOutput } from "../scene/schema";

export type LiveDirector = DirectorOutput | null;

export default function AskForm({ onLive }: { onLive?: (output: DirectorOutput) => void }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Array<{ role: "visitor" | "aden"; text: string }>>([]);
  const [status, setStatus] = useState("Ready. Five questions per visit.");
  const [listening, setListening] = useState(false);
  const speech = useMemo(
    () => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  async function submit(next = question) {
    const text = next.trim();
    if (!text) return;
    setQuestion("");
    setTurns((current) => [...current, { role: "visitor", text }]);
    await askAden(text, (event: AskEvent) => {
      if (event.type === "status") setStatus(event.value);
      if (event.type === "error") {
        setStatus(event.message);
        const cached = cachedAnswers.find((item) => item.question.toLowerCase() === text.toLowerCase()) ?? cachedAnswers[0];
        setTurns((current) => [...current, { role: "aden", text: cached.output.speech }]);
        onLive?.(cached.output);
      }
      if (event.type === "answer") {
        setStatus(event.degraded ? "Cached / budget path." : "Answered from the corpus.");
        setTurns((current) => [...current, { role: "aden", text: event.output.speech }]);
        onLive?.(event.output);
        if (event.voiceAllowed) {
          void fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: event.output.speech }),
          }).then(async (response) => {
            if (!response.ok) return;
            const blob = await response.blob();
            if (blob.size < 32) return;
            const url = URL.createObjectURL(blob);
            void new Audio(url).play().catch(() => undefined);
          });
        }
      }
    });
  }

  return (
    <div className="ask-shell">
      <div className="ask-log" aria-live="polite">
        {turns.map((turn, index) => (
          <div className="ask-msg" data-role={turn.role} key={`${turn.role}-${index}`}>
            <p className="meta">{turn.role === "visitor" ? "You" : "Aden"}</p>
            <p>{turn.text}</p>
          </div>
        ))}
      </div>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="ask-q">
          Ask Aden
          <textarea
            id="ask-q"
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why does graph engineering matter if AI can already read a repo?"
          />
        </label>
        <div className="actions">
          <button className="btn btn-solid" type="submit">
            Send
          </button>
          {speech ? (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setListening(true);
                listenForSpeech((spoken) => {
                  setListening(false);
                  void submit(spoken);
                });
              }}
            >
              {listening ? "Listening" : "Speak"}
            </button>
          ) : null}
        </div>
        <p className="status">{status}</p>
      </form>
    </div>
  );
}
