import { z } from "zod";
import { emotions, gestures, directorOutputSchema, type DirectorOutput, type SceneCommand } from "../scene/schema";
import type { Retrieved } from "../rag/types";

/**
 * What the model fills. Kept flat and fully required (nullable instead of optional) so it is a valid
 * structured-output schema for every provider. The server converts it to the richer scene language.
 */
export const visualKinds = ["none", "graph", "compare", "timeline", "code", "text"] as const;
export const actionKinds = ["none", "book_call", "leave_message", "fit_check"] as const;

const panelWire = z.object({ title: z.string(), body: z.string() });

// Structured outputs do not enforce enums through the SDK's schema transform, so enum fields are
// strings on the wire with the allowed values in the description, and are coerced in fromWire.
const oneOf = (values: readonly string[], about: string) => z.string().describe(`${about} One of: ${values.join(", ")}.`);

export function coerce<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const v = value.trim().toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

export const wireSchema = z.object({
  speech: z.string().describe("What Aden says out loud, first person, plain spoken sentences, usually under 70 words."),
  summary: z.string().describe("The gist of the answer in three to eight words, for a one-line log."),
  citations: z.array(z.string()).describe("Ids of the notes the speech relies on, copied exactly from the corpus, e.g. positions/hiring.md#0."),
  noPosition: z.boolean().describe("True when the notes do not contain Aden's position on the question."),
  emotion: oneOf(emotions, "Facial expression for the avatar."),
  gesture: oneOf(gestures, "Body gesture for the avatar."),
  visual: z.object({
    kind: oneOf(visualKinds, "Representation shown beside the avatar."),
    title: z.string().nullable(),
    left: panelWire.nullable(),
    right: panelWire.nullable(),
    items: z.array(z.string()).nullable(),
    code: z.string().nullable(),
    text: z.string().nullable(),
  }),
  action: z.object({
    kind: oneOf(actionKinds, "Action to offer the visitor."),
    reason: z.string().nullable().describe("One short sentence shown to the visitor on the action card."),
  }),
});

export type Wire = z.infer<typeof wireSchema>;

export type ActionKind = (typeof actionKinds)[number];
export type Action = { kind: Exclude<ActionKind, "none">; reason: string } | null;

export type DirectorResult = {
  output: DirectorOutput;
  summary: string;
  citations: string[];
  action: Action;
};

const cut = (text: string | null | undefined, max: number) => (text ?? "").trim().slice(0, max);

function sceneFor(visual: Wire["visual"]): SceneCommand[] {
  switch (coerce(visual.kind, visualKinds, "none")) {
    case "graph":
      return [{ action: "showGraph", id: "repositoryGraph", title: cut(visual.title, 80) || "Repository graph", position: "avatarLeft" }];
    case "compare":
      if (!visual.left || !visual.right) return [];
      return [
        {
          action: "compare",
          id: "compare",
          left: { title: cut(visual.left.title, 80), body: cut(visual.left.body, 280) },
          right: { title: cut(visual.right.title, 80), body: cut(visual.right.body, 280) },
          position: "center",
        },
      ];
    case "timeline": {
      const items = (visual.items ?? []).map((item) => cut(item, 80)).filter(Boolean).slice(0, 6);
      return items.length ? [{ action: "showTimeline", id: "timeline", items, position: "avatarRight" }] : [];
    }
    case "code":
      return visual.code
        ? [{ action: "showCode", id: "code", title: cut(visual.title, 80) || undefined, code: cut(visual.code, 800), position: "avatarRight" }]
        : [];
    case "text":
      return visual.text ? [{ action: "showText", id: "claim", text: cut(visual.text, 280), position: "center" }] : [];
    default:
      return [];
  }
}

/** Validates the model's wire output against what was actually retrieved and builds the scene. */
export function fromWire(wire: Wire, hits: Retrieved[]): DirectorResult {
  const known = new Set(hits.map((hit) => hit.id));
  // A citation the retriever never returned is a hallucinated source. Drop it.
  const citations = [...new Set(wire.citations.filter((id) => known.has(id)))];
  // The model may decide a weak retrieval still answers the question, but it may not claim a
  // position while citing nothing.
  const noPosition = wire.noPosition || citations.length === 0;
  const scene = sceneFor(wire.visual);
  const output = directorOutputSchema.parse({
    speech: cut(wire.speech, 1200) || "I have not written that down yet.",
    performance: {
      emotion: coerce(wire.emotion, emotions, "neutral"),
      gesture: coerce(wire.gesture, gestures, "talk_neutral"),
      lookAt: scene[0] && "id" in scene[0] ? scene[0].id : "visitor",
    },
    scene,
    noPosition,
  });
  const kind = coerce(wire.action.kind, actionKinds, "none");
  const action: Action = kind === "none" ? null : { kind, reason: cut(wire.action.reason, 160) || defaultReason(kind) };
  return { output, summary: cut(wire.summary, 80) || summarize(output.speech), citations, action };
}

/** A one-line gist when the model did not write one: the first clause of the first sentence. */
export function summarize(speech: string): string {
  const first = speech.split(/(?<=[.!?])\s/)[0] ?? speech;
  const clause = first.split(/[,:;]/)[0].trim().replace(/[.!?]$/, "");
  return clause.length > 64 ? `${clause.slice(0, 63).trimEnd()}…` : clause;
}

export function defaultReason(kind: Exclude<ActionKind, "none">): string {
  switch (kind) {
    case "book_call":
      return "Twenty minutes with Aden himself.";
    case "leave_message":
      return "Aden reads every message and replies himself.";
    case "fit_check":
      return "Paste the job description and get an honest match, gaps included.";
  }
}
