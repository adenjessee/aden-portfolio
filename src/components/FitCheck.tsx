import { useState } from "react";
import { checkFit, type Meter } from "../client/askClient";
import type { FitReport } from "../director/fit";
import { noteHref } from "../rag/provenance";
import MessageForm from "./MessageForm";

const STATUS_LABEL = { match: "evidence", partial: "adjacent", gap: "gap" } as const;

function noteLink(id: string): { href: string; label: string } {
  const path = id.split("#")[0];
  return { href: noteHref(path), label: path.replace(/\.md$/, "") };
}

export default function FitCheck({ onMeter }: { onMeter?: (meter: Meter) => void }) {
  const [jd, setJd] = useState("");
  const [report, setReport] = useState<FitReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    const result = await checkFit(jd);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setReport(result.report);
    onMeter?.(result.meter);
  }

  return (
    <div className="fit">
      {!report ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <label>
            Job description
            <textarea
              className="fit-input"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the responsibilities and requirements. Each line is matched against Aden's notes, and gaps are listed as gaps."
              maxLength={6000}
            />
          </label>
          <div className="actions">
            <button className="btn btn-solid" type="submit" disabled={busy || jd.trim().length < 80}>
              {busy ? "Reading it…" : "Check the fit"}
            </button>
            <span className="status">Uses two of this visit's live questions.</span>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      ) : (
        <div className="fit-report">
          <p className="fit-verdict" data-verdict={report.verdict}>
            <span className="pill">{report.verdict} fit</span> {report.summary}
          </p>
          <ol className="fit-rows">
            {report.rows.map((row, index) => (
              <li key={`${index}-${row.requirement}`} data-status={row.status}>
                <span className="pill">{STATUS_LABEL[row.status]}</span>
                <div>
                  <p className="fit-req">{row.requirement}</p>
                  <p className="fit-evidence">
                    {row.evidence}{" "}
                    {row.citations.map((id) => {
                      const link = noteLink(id);
                      return (
                        <a key={id} className="cite" href={link.href}>
                          {link.label}
                        </a>
                      );
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {report.questionsForAden.length ? (
            <div className="fit-questions">
              <p className="meta">Only Aden can answer</p>
              <ul>
                {report.questionsForAden.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="status">
            {report.mode === "llm" ? report.model : "matched word by word against the notes"} ·{" "}
            {report.costUsd > 0 ? `$${report.costUsd.toFixed(4)}` : "$0"} · {(report.latencyMs / 1000).toFixed(1)}s
          </p>
          <div className="actions">
            <button className="btn btn-solid" type="button" onClick={() => setSending(true)}>
              Send this role to Aden
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setReport(null);
                setSending(false);
              }}
            >
              Check another role
            </button>
          </div>
          {sending ? (
            <MessageForm
              kind="message"
              transcript={[]}
              prefill={`I'd like to talk about this role.\n\nFit check: ${report.verdict}. ${report.rows.filter((r) => r.status === "gap").length} gaps.\n\n${jd.slice(0, 1200)}`}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
