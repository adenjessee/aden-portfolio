/**
 * Deterministic scrubbing that runs on everything before a model or a reviewer sees it. It is the
 * floor; the extractor's sensitivity rating and Aden's review are the walls above it.
 */
const PATTERNS: [RegExp, string][] = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]"],
  [/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, "[phone]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[card]"],
  [/\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Way|Ct|Court)\b\.?/g, "[address]"],
  [/\b(?:sk|pk|xi|ghp|gho|AKIA)[-_][A-Za-z0-9_-]{12,}\b/g, "[secret]"],
  [/\b(?:password|passwd|api[_ ]?key|token)\s*[:=]\s*\S+/gi, "[secret]"],
];

export function scrub(text: string): string {
  return PATTERNS.reduce((out, [pattern, label]) => out.replace(pattern, label), text);
}

export function containsPii(text: string): boolean {
  return scrub(text) !== text;
}
