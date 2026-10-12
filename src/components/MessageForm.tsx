import { useState } from "react";
import { sendMessage } from "../client/askClient";
import type { HistoryTurn } from "../director/prompt";

type Props = {
  kind: "message" | "book_call";
  transcript: HistoryTurn[];
  prefill?: string;
};

/** The visitor writes and sends this themselves. AI Aden never sends anything on its own. */
export default function MessageForm({ kind, transcript, prefill = "" }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState(prefill);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  if (state === "sent") {
    return (
      <p className="action-done" role="status">
        Sent. Aden reads these himself and replies by email, usually within a day.
      </p>
    );
  }

  return (
    <form
      className="message-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("sending");
        setError("");
        const result = await sendMessage({ kind, name, email, company, message, website, transcript });
        if ("error" in result) {
          setError(result.error);
          setState("idle");
        } else {
          setState("sent");
        }
      }}
    >
      <div className="field-row">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label>
        Company or role <span className="optional">(optional)</span>
        <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={160} autoComplete="organization" />
      </label>
      <label>
        {kind === "book_call" ? "What do you want to talk about, and when works for you?" : "Message"}
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={2000} />
      </label>
      <label className="hp" aria-hidden="true">
        Website
        <input tabIndex={-1} value={website} onChange={(e) => setWebsite(e.target.value)} autoComplete="off" />
      </label>
      <p className="fine">The last few turns of this conversation go with your message so Aden has the context.</p>
      <div className="actions">
        <button className="btn btn-solid" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send to Aden"}
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
