import { useState } from "react";
import type { Meter } from "../client/askClient";
import { site } from "../config/site";
import type { HistoryTurn } from "../director/prompt";
import type { Action } from "../director/wire";
import FitCheck from "./FitCheck";
import MessageForm from "./MessageForm";

const TITLES = {
  book_call: "Talk to Aden",
  leave_message: "Leave Aden a message",
  fit_check: "Check a role against Aden's notes",
} as const;

/** An action AI Aden suggests. Nothing happens until the visitor opens it and acts. */
export default function ActionCard({ action, transcript, onMeter }: { action: NonNullable<Action>; transcript: HistoryTurn[]; onMeter?: (m: Meter) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="action-card" data-kind={action.kind} aria-label={TITLES[action.kind]}>
      <div className="action-head">
        <div>
          <p className="meta">Suggested action</p>
          <p className="action-title">{TITLES[action.kind]}</p>
          <p className="action-reason">{action.reason}</p>
        </div>
        {action.kind === "book_call" && site.bookingUrl ? (
          <a className="btn btn-solid" href={site.bookingUrl} target="_blank" rel="noopener">
            Pick a time
          </a>
        ) : !open ? (
          <button className="btn btn-solid" type="button" onClick={() => setOpen(true)}>
            {action.kind === "fit_check" ? "Paste a job description" : action.kind === "book_call" ? "Request a call" : "Write a message"}
          </button>
        ) : null}
      </div>
      {open && action.kind === "fit_check" ? <FitCheck onMeter={onMeter} /> : null}
      {open && action.kind !== "fit_check" ? (
        <MessageForm kind={action.kind === "book_call" ? "book_call" : "message"} transcript={transcript} />
      ) : null}
    </section>
  );
}
