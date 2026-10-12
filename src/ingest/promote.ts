/**
 * Writes reviewed facts into the notes. Each target note gets a "Reviewed facts" section of first-person
 * bullets marked draft, so retrieval can use them at once; turning bullets into prose is a later edit.
 */
export function mergeIntoNote(existing: string | null, target: string, claims: string[], date: string): string {
  const bullets = claims.map((c) => `- ${c}`).join("\n");
  if (!existing) {
    const title = target.split("/").pop()!.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    return `---\nsource: Aden / ${target}.md\nconfidence: medium\nstatus: draft\nlast_updated: ${date}\ntitle: ${title}\n---\n\n## Reviewed facts\n\n${bullets}\n`;
  }
  const withDate = existing.replace(/^last_updated: .*$/m, `last_updated: ${date}`);
  // A note Aden has verified becomes draft again until the new facts are folded in.
  const statused = withDate.replace(/^status: verified$/m, "status: draft");
  const present = new Set(statused.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim()));
  const fresh = claims.filter((c) => !present.has(c));
  if (!fresh.length) return existing;
  const block = fresh.map((c) => `- ${c}`).join("\n");
  return statused.includes("\n## Reviewed facts\n")
    ? statused.replace(/\n## Reviewed facts\n\n/, `\n## Reviewed facts\n\n${block}\n`)
    : `${statused.trimEnd()}\n\n## Reviewed facts\n\n${block}\n`;
}
