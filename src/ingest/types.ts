/**
 * A fact about Aden pulled from a source, waiting for his review. Nothing becomes a public note
 * until he has checked it.
 */
export type Sensitivity = "public" | "professional" | "private" | "sensitive";

export type Candidate = {
  id: string;
  /** Where it came from, precise enough to find it again: "linkedin:Positions.csv#2". */
  source: string;
  /** The note it belongs in, as a content/kb path without .md, or "new/<slug>". */
  target: string;
  /** First person, one claim, as Aden would say it. */
  claim: string;
  /** A short quote from the source that supports the claim. */
  evidence: string;
  sensitivity: Sensitivity;
  confidence: "high" | "medium" | "low";
  /** How many sources said the same thing, after de-duplication. */
  seen: number;
};

/** Only these may ever reach the review file. */
export const PUBLISHABLE: Sensitivity[] = ["public", "professional"];

/** Note paths the extractor may route facts to. Anything else becomes new/<slug>. */
export const TARGETS = [
  "me/biography",
  "me/how-i-work",
  "me/timeline",
  "me/location-and-availability",
  "me/interests-outside-work",
  "me/contact",
  "career/experience",
  "career/skills-and-stack",
  "career/roles-i-want",
  "career/strengths-and-weaknesses",
  "career/working-with-me",
  "projects/gridschool",
  "projects/gridseak",
  "projects/hire-engine",
  "projects/map-builder",
  "projects/ai-setter",
  "projects/client-work",
  "positions/ai-agents",
  "positions/ai-coding-tools",
  "positions/evals-and-verification",
  "positions/graph-engineering",
  "positions/hiring",
  "positions/juniors-and-ai",
  "positions/rag-and-grounding",
  "positions/software-engineering-future",
  "positions/cost-and-budgets",
  "beliefs/engineering",
  "beliefs/ai",
  "beliefs/education",
  "beliefs/business",
  "stories/becoming-engineer",
  "stories/building-gridschool",
  "stories/mistakes",
] as const;
