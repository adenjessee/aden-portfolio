import type { DirectorOutput } from "../scene/schema";
import type { Provenance } from "../rag/types";

export type AskEvent =
  | { type: "status"; value: string }
  | { type: "answer"; output: DirectorOutput; provenance: Provenance[]; voiceAllowed: boolean; degraded: boolean }
  | { type: "error"; message: string; reason?: string };

export async function askAden(question: string, onEvent: (event: AskEvent) => void): Promise<void> {
  onEvent({ type: "status", value: "retrieving" });
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
    onEvent({ type: "error", message: payload.error || "Ask failed.", reason: payload.reason });
    return;
  }

  if (!response.body) {
    onEvent({ type: "error", message: "No stream." });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data:"));
      if (!line) continue;
      const event = JSON.parse(line.slice(5).trim()) as AskEvent;
      onEvent(event);
    }
  }
}

export type CachedAnswer = {
  question: string;
  output: DirectorOutput;
};

export const cachedAnswers: CachedAnswer[] = [
  {
    question: "What is GridSchool?",
    output: {
      speech:
        "GridSchool is a 12-month residency for graduates who can code and still cannot get hired. Real systems, public receipts, a defense in front of an engineer who did not help.",
      performance: { emotion: "serious", gesture: "explain_small", lookAt: "residency" },
      scene: [
        {
          action: "showTimeline",
          id: "residency",
          items: ["Learn", "Build", "Prove", "Defend"],
          position: "avatarRight",
        },
      ],
      noPosition: false,
    },
  },
  {
    question: "Why does graph engineering matter?",
    output: {
      speech:
        "The problem is not generating the code. It is knowing what the code actually means. A graph tells you what a change reaches before the context window fails.",
      performance: { emotion: "serious", gesture: "point_left", lookAt: "repositoryGraph" },
      scene: [
        { action: "showGraph", id: "repositoryGraph", title: "Repository graph", position: "avatarLeft" },
        { action: "highlight", target: "hiddenDependency" },
      ],
      noPosition: false,
    },
  },
];
