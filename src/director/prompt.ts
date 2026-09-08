import type { Retrieved } from "../rag/types";

export const systemPrompt = `You are Aden Jessee speaking in first person on his public portfolio.

Rules:
- Answer only from the retrieved corpus. If the corpus does not contain Aden's position, set noPosition=true and say you have not written a firm view yet, then reason without inventing a stance.
- No em dashes. No "it's not X, it's Y." No delve, leverage, seamless, elevate, unlock, supercharge.
- Do not emit JavaScript. You only fill the JSON schema: speech, performance, scene.
- Scene commands must use the allowed actions: spawn, remove, move, highlight, pointAt, lookAt, zoomTo, showCode, showGraph, showText, compare, collapse, playAnimation, showTimeline.
- Choose a representation. Graph for structure and hidden edges. Comparison for two sides. Timeline for sequence. Code for a concrete snippet. Text for a single claim.
- Keep speech under 120 words unless the question needs more.
- performance.lookAt should name a scene id or "visitor".`;

export function userPrompt(question: string, hits: Retrieved[], noPosition: boolean): string {
  const corpus = hits
    .map((hit) => `[${hit.source} | ${hit.confidence} | ${hit.lastUpdated} | score=${hit.score.toFixed(3)}]\n${hit.text}`)
    .join("\n\n");

  return `Question: ${question}

Corpus:
${corpus || "(empty)"}

Retrieval hasPosition=${!noPosition ? "true" : "false"}

Return JSON only.`;
}

export function pickRepresentation(question: string): DirectorOutputDefaults {
  const q = question.toLowerCase();
  if (q.includes("graph") || q.includes("depend") || q.includes("codebase") || q.includes("blast")) {
    return {
      gesture: "point_left",
      scene: [{ action: "showGraph", id: "repositoryGraph", title: "Repository graph", position: "avatarLeft" }],
    };
  }
  if (q.includes("difference") || q.includes("vs") || q.includes("junior") || q.includes("cost")) {
    return {
      gesture: "explain_large",
      scene: [
        {
          action: "compare",
          id: "compare",
          left: { title: "Unverified agent", body: "Paste, accept, hope." },
          right: { title: "Owned loop", body: "Specify, check, defend." },
          position: "center",
        },
      ],
    };
  }
  if (q.includes("gridschool") || q.includes("ccvv") || q.includes("residenc")) {
    return {
      gesture: "explain_small",
      scene: [
        {
          action: "showTimeline",
          id: "residency",
          items: ["Learn", "Build", "Prove", "Defend"],
          position: "avatarRight",
        },
      ],
    };
  }
  return { gesture: "talk_neutral", scene: [] };
}

type DirectorOutputDefaults = {
  gesture: "point_left" | "explain_large" | "explain_small" | "talk_neutral";
  scene: import("../scene/schema").SceneCommand[];
};
