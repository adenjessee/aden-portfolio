import type { Candidate } from "./types";

const words = (text: string) => new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));

function similar(a: string, b: string): boolean {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return false;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared / Math.min(x.size, y.size) >= 0.75;
}

/** The same fact said in several conversations becomes one candidate, more confident for it. */
export function dedupe(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of candidates) {
    const twin = kept.find((k) => k.target === c.target && similar(k.claim, c.claim));
    if (!twin) {
      kept.push({ ...c });
      continue;
    }
    twin.seen += c.seen;
    if (twin.seen >= 3 && twin.confidence === "low") twin.confidence = "medium";
    if (c.claim.length > twin.claim.length && c.confidence !== "low") twin.claim = c.claim;
  }
  return kept;
}

const ORDER = { high: 0, medium: 1, low: 2 } as const;

/**
 * The review file: one checkbox per fact, grouped by the note it would go into. Aden ticks what is
 * true and fine to publish, edits wording in place, and leaves the rest.
 */
export function renderReview(candidates: Candidate[], meta: { generatedAt: string; sources: string[] }): string {
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) groups.set(c.target, [...(groups.get(c.target) ?? []), c]);
  const lines = [
    "# Facts to review",
    "",
    `Generated ${meta.generatedAt} from: ${meta.sources.join(", ")}.`,
    "",
    "Tick `[x]` each fact that is true and fine for the public site. Edit the wording on the line if you like.",
    "Anything unticked is ignored. Then run `npm run ingest -- promote`.",
    "Private and sensitive facts were already dropped and are not in this file.",
    "",
  ];
  for (const target of [...groups.keys()].sort()) {
    lines.push(`## ${target}`, "");
    for (const c of groups.get(target)!.sort((a, b) => ORDER[a.confidence] - ORDER[b.confidence] || b.seen - a.seen)) {
      lines.push(`- [ ] ${c.claim}`);
      lines.push(`  <!-- id: ${c.id} | ${c.sensitivity} | ${c.confidence} | seen ${c.seen}x | "${c.evidence.replace(/-->/g, "")}" -->`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Ticked facts, with any edits Aden made to the wording, keyed by target note. */
export function parseReview(markdown: string): Map<string, { claim: string; id: string }[]> {
  const out = new Map<string, { claim: string; id: string }[]>();
  let target = "";
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^## (.+)$/);
    if (heading) {
      target = heading[1].trim();
      continue;
    }
    const item = lines[i].match(/^- \[[xX]\] (.+)$/);
    if (!item || !target) continue;
    const id = lines[i + 1]?.match(/id: ([^|]+)\|/)?.[1]?.trim() ?? "";
    out.set(target, [...(out.get(target) ?? []), { claim: item[1].trim(), id }]);
  }
  return out;
}
