import { useEffect, useState } from "react";
import type { AnswerTrace } from "../director/answer";
import { noteHref } from "../rag/provenance";
import type { Provenance } from "../rag/types";

type Props = {
  question: string;
  provenance: Provenance[];
  trace: AnswerTrace | null;
  threshold: number;
};

const ROW = 30;
const NODE_H = 24;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

/** One node per note. Two paragraphs of the same note are one source to the visitor. */
function byNote(provenance: Provenance[]): Provenance[] {
  const notes = new Map<string, Provenance>();
  for (const p of provenance) {
    const seen = notes.get(p.path);
    if (!seen) notes.set(p.path, { ...p });
    else notes.set(p.path, { ...seen, cited: seen.cited || p.cited, match: Math.max(seen.match, p.match) });
  }
  return [...notes.values()];
}

function modeLabel(trace: AnswerTrace | null): string {
  if (!trace) return "writing…";
  if (trace.mode === "screened") return "screened";
  if (trace.mode === "extractive") return trace.failure ? "notes only (model failed)" : "notes only";
  return trace.model ?? "model";
}

/**
 * How one answer was made, drawn as a map: the question, the notes retrieval reached, which of
 * them the answer cites, and the answer. Lit edges are citations. Dashed notes fell under the
 * threshold. Every note links to its source.
 */
export default function TraceMap({ question, provenance, trace, threshold }: Props) {
  const narrow = useNarrow();
  const notes = byNote(provenance).slice(0, 6);
  const answered = trace !== null;
  const screened = trace?.mode === "screened";

  if (narrow) {
    // Vertical: question on top, notes as rows, answer at the bottom.
    const width = 340;
    const top = 44;
    const height = top + Math.max(1, notes.length) * ROW + 56;
    const answerY = height - 34;
    return (
      <figure className="trace" aria-label="How this answer was made">
        <svg viewBox={`0 0 ${width} ${height}`} role="img">
          <title>Retrieval map for this answer</title>
          <g className="trace-node trace-question">
            <rect x={8} y={6} width={width - 16} height={NODE_H} rx={5} />
            <text x={18} y={22}>
              {clip(question, 46)}
            </text>
          </g>
          {notes.map((note, i) => {
            const y = top + i * ROW;
            const weak = note.match < threshold;
            const cls = `trace-node trace-note${note.cited ? " is-cited" : ""}${weak ? " is-weak" : ""}`;
            return (
              <g key={note.id}>
                <line className={`trace-edge${note.cited ? " is-cited" : ""}`} x1={22} y1={30} x2={22} y2={y + NODE_H / 2} />
                <a href={noteHref(note.path)}>
                  <rect className={cls} x={34} y={y} width={width - 42} height={NODE_H} rx={5} />
                  <text className="trace-label" x={44} y={y + 16}>
                    {clip(note.title, 30)}
                  </text>
                  <text className="trace-score" x={width - 16} y={y + 16} textAnchor="end">
                    {note.match.toFixed(2)}
                  </text>
                </a>
              </g>
            );
          })}
          <g className={`trace-node trace-answer${answered ? " is-done" : " is-pending"}`}>
            <rect x={8} y={answerY} width={width - 16} height={NODE_H + 4} rx={5} />
            <text x={18} y={answerY + 18}>
              {screened ? "Answer · screened before the model" : `Answer · ${modeLabel(trace)}`}
            </text>
          </g>
        </svg>
        <TraceLegend trace={trace} threshold={threshold} notes={notes} />
      </figure>
    );
  }

  const width = 680;
  const height = Math.max(130, notes.length * ROW + 24);
  const mid = height / 2;
  const qx = 8;
  const qw = 170;
  const nx = 236;
  const nw = 250;
  const ax = 540;
  const aw = 132;
  const firstY = mid - (notes.length * ROW) / 2 + (ROW - NODE_H) / 2;

  return (
    <figure className="trace" aria-label="How this answer was made">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <title>Retrieval map for this answer</title>
        {notes.map((note, i) => {
          const y = firstY + i * ROW + NODE_H / 2;
          return (
            <g key={`e-${note.id}`}>
              <path
                className={`trace-edge${note.cited ? " is-cited" : ""}${note.match < threshold ? " is-weak" : ""}`}
                d={`M${qx + qw},${mid} C${qx + qw + 32},${mid} ${nx - 32},${y} ${nx},${y}`}
                style={{ opacity: 0.25 + note.match * 0.75 }}
              />
              {note.cited && answered ? (
                <path className="trace-edge is-cited is-out" d={`M${nx + nw},${y} C${nx + nw + 30},${y} ${ax - 30},${mid} ${ax},${mid}`} />
              ) : null}
            </g>
          );
        })}

        <g className="trace-node trace-question">
          <rect x={qx} y={mid - 22} width={qw} height={44} rx={6} />
          <text className="trace-kicker" x={qx + 10} y={mid - 6}>
            QUESTION
          </text>
          <text x={qx + 10} y={mid + 11}>
            {clip(question, 24)}
          </text>
        </g>

        {notes.length === 0 ? (
          <text className="trace-empty" x={nx + 10} y={mid + 4}>
            no note matched
          </text>
        ) : null}

        {notes.map((note, i) => {
          const y = firstY + i * ROW;
          const weak = note.match < threshold;
          const cls = `trace-node trace-note${note.cited ? " is-cited" : ""}${weak ? " is-weak" : ""}`;
          return (
            <a key={note.id} href={noteHref(note.path)}>
              <title>{`${note.title} · ${note.status} · match ${note.match.toFixed(2)}`}</title>
              <rect className={cls} x={nx} y={y} width={nw} height={NODE_H} rx={5} />
              <circle className={`trace-status is-${note.status}`} cx={nx + 12} cy={y + NODE_H / 2} r={3} />
              <text className="trace-label" x={nx + 22} y={y + 16}>
                {clip(note.title, 26)}
              </text>
              <rect className="trace-bar-bg" x={nx + nw - 58} y={y + 10} width={44} height={4} rx={2} />
              <rect className="trace-bar" x={nx + nw - 58} y={y + 10} width={44 * note.match} height={4} rx={2} />
            </a>
          );
        })}

        <g className={`trace-node trace-answer${answered ? " is-done" : " is-pending"}`}>
          <rect x={ax} y={mid - 22} width={aw} height={44} rx={6} />
          <text className="trace-kicker" x={ax + 10} y={mid - 6}>
            {screened ? "SCREENED" : "ANSWER"}
          </text>
          <text x={ax + 10} y={mid + 11}>
            {clip(modeLabel(trace), 18)}
          </text>
        </g>
      </svg>
      <TraceLegend trace={trace} threshold={threshold} notes={notes} />
    </figure>
  );
}

function TraceLegend({ trace, threshold, notes }: { trace: AnswerTrace | null; threshold: number; notes: Provenance[] }) {
  const cited = notes.filter((note) => note.cited).length;
  return (
    <figcaption className="trace-legend">
      <span>
        <i className="key key-cited" /> cited {cited}
      </span>
      <span>
        <i className="key key-weak" /> under {threshold.toFixed(2)} match
      </span>
      {trace ? (
        <span>
          {trace.costUsd > 0 ? `$${trace.costUsd.toFixed(4)}` : "$0"}
          {trace.usage ? ` · ${trace.usage.inputTokens + trace.usage.cacheReadTokens + trace.usage.cacheWriteTokens} in / ${trace.usage.outputTokens} out` : ""} ·{" "}
          {(trace.latencyMs / 1000).toFixed(1)}s
        </span>
      ) : null}
    </figcaption>
  );
}
