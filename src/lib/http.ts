import type { HistoryTurn } from "../director/prompt";

export function json(data: unknown, init: ResponseInit & { cookie?: string } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  if (init.cookie) headers.append("Set-Cookie", init.cookie);
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Rejects cross-site POSTs so another page cannot spend a visitor's questions or file messages. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** History comes from the browser, so it is trimmed and typed here and treated as context only. */
export function cleanHistory(raw: unknown, maxTurns: number): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (turn): turn is HistoryTurn =>
        Boolean(turn) &&
        typeof turn === "object" &&
        (turn.role === "visitor" || turn.role === "aden") &&
        typeof turn.text === "string",
    )
    .slice(-maxTurns * 2)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 1200) }));
}
