import { z } from "zod";

export const emotions = [
  "neutral",
  "interested",
  "skeptical",
  "amused",
  "excited",
  "concerned",
  "confused",
  "thinking",
  "serious",
] as const;

export const gestures = [
  "idle",
  "talk_neutral",
  "talk_excited",
  "think",
  "look_left",
  "look_right",
  "point_left",
  "point_right",
  "point_up",
  "shrug",
  "cross_arms",
  "hands_together",
  "explain_small",
  "explain_large",
  "laugh",
  "disagree",
  "nod",
] as const;

export const positions = ["avatarLeft", "avatarRight", "center", "above"] as const;

const panel = z.object({
  title: z.string().max(80),
  body: z.string().max(280),
});

export const sceneCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("spawn"),
    id: z.string().max(64),
    object: z.string().max(64),
    position: z.enum(positions).default("avatarLeft"),
  }),
  z.object({ action: z.literal("remove"), id: z.string().max(64) }),
  z.object({
    action: z.literal("move"),
    id: z.string().max(64),
    position: z.enum(positions),
  }),
  z.object({ action: z.literal("highlight"), target: z.string().max(64) }),
  z.object({ action: z.literal("pointAt"), target: z.string().max(64) }),
  z.object({ action: z.literal("lookAt"), target: z.string().max(64) }),
  z.object({
    action: z.literal("zoomTo"),
    target: z.string().max(64),
    style: z.enum(["focus", "wide"]).default("focus"),
  }),
  z.object({
    action: z.literal("showCode"),
    id: z.string().max(64).default("code"),
    title: z.string().max(80).optional(),
    code: z.string().max(800),
    position: z.enum(positions).default("avatarRight"),
  }),
  z.object({
    action: z.literal("showGraph"),
    id: z.string().max(64).default("repositoryGraph"),
    title: z.string().max(80).optional(),
    position: z.enum(positions).default("avatarLeft"),
  }),
  z.object({
    action: z.literal("showText"),
    id: z.string().max(64),
    text: z.string().max(280),
    position: z.enum(positions).default("center"),
  }),
  z.object({
    action: z.literal("compare"),
    id: z.string().max(64).default("compare"),
    left: panel,
    right: panel,
    position: z.enum(positions).default("center"),
  }),
  z.object({ action: z.literal("collapse"), id: z.string().max(64) }),
  z.object({
    action: z.literal("playAnimation"),
    gesture: z.enum(gestures),
  }),
  z.object({
    action: z.literal("showTimeline"),
    id: z.string().max(64).default("timeline"),
    items: z.array(z.string().max(80)).max(6),
    position: z.enum(positions).default("center"),
  }),
]);

export const performanceSchema = z.object({
  emotion: z.enum(emotions).default("neutral"),
  gesture: z.enum(gestures).default("talk_neutral"),
  lookAt: z.string().max(64).default("visitor"),
});

export const directorOutputSchema = z.object({
  speech: z.string().min(1).max(1200),
  performance: performanceSchema,
  scene: z.array(sceneCommandSchema).max(12).default([]),
  noPosition: z.boolean().default(false),
});

export type SceneCommand = z.infer<typeof sceneCommandSchema>;
export type Performance = z.infer<typeof performanceSchema>;
export type DirectorOutput = z.infer<typeof directorOutputSchema>;

export function parseDirectorOutput(raw: unknown): DirectorOutput {
  return directorOutputSchema.parse(raw);
}

export function safeParseDirectorOutput(raw: unknown):
  | { ok: true; value: DirectorOutput }
  | { ok: false; error: string } {
  const result = directorOutputSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.message };
}
