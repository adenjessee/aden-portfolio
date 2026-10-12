import type { FitReport } from "../director/fit";
import type { HistoryTurn } from "../director/prompt";
import type { AskEvent, Meter } from "../protocol";

export type { AnswerEvent, AskEvent, Meter } from "../protocol";

export async function askAden(
  question: string,
  history: HistoryTurn[],
  onEvent: (event: AskEvent) => void,
  opts: { voice?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history, voice: opts.voice === true }),
    signal: opts.signal,
  }).catch(() => null);

  if (opts.signal?.aborted) return;
  if (!response) {
    onEvent({ type: "error", message: "Could not reach the server. The notes still work offline-first at /notes." });
    return;
  }
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    onEvent({ type: "error", message: payload.error || "That question did not go through." });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true as const }));
    if (done || opts.signal?.aborted) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data:"));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as AskEvent);
      } catch {
        // A torn frame is skipped; the final answer event is what matters.
      }
    }
  }
}

export async function checkFit(jd: string): Promise<{ report: FitReport; meter: Meter } | { error: string }> {
  const response = await fetch("/api/fit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd }),
  }).catch(() => null);
  if (!response) return { error: "Could not reach the server." };
  const payload = (await response.json().catch(() => ({}))) as { report?: FitReport; meter?: Meter; error?: string };
  if (!response.ok || !payload.report || !payload.meter) return { error: payload.error || "The fit check failed." };
  return { report: payload.report, meter: payload.meter };
}

export type MessageDraft = {
  kind: "message" | "book_call";
  name: string;
  email: string;
  company: string;
  message: string;
  website: string;
  transcript: HistoryTurn[];
};

export async function sendMessage(draft: MessageDraft): Promise<{ ok: true } | { error: string }> {
  const response = await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  }).catch(() => null);
  if (!response) return { error: "Could not reach the server." };
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return response.ok && payload.ok ? { ok: true } : { error: payload.error || "The message did not send." };
}

export type Status = Omit<Meter, "freeReason"> & { model: string | null; provider: string; stt: "browser" | "elevenlabs" };

export async function fetchStatus(): Promise<Status | null> {
  const response = await fetch("/api/status").catch(() => null);
  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as Status | null;
}
