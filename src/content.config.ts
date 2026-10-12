import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    role: z.string(),
    stack: z.array(z.string()),
    href: z.string().optional(),
    repo: z.string().optional(),
    receipts: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      )
      .default([]),
    featured: z.boolean().default(true),
    order: z.number().default(0),
  }),
});

// The notes AI Aden answers from. Published at /notes so every citation opens its source.
const kb = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/kb" }),
  schema: z.object({
    title: z.string(),
    source: z.string(),
    confidence: z.enum(["high", "medium", "low"]).default("medium"),
    status: z.enum(["verified", "draft", "mock"]).default("draft"),
    last_updated: z.coerce.string(),
  }),
});

export const collections = { projects, kb };
