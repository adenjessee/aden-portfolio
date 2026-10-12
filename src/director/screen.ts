/**
 * Deterministic screen in front of the model. It catches the cheap, common attempts to make AI Aden
 * say something Aden never wrote. Anything subtler is the system prompt's job, and the evals cover both.
 */
export type Screen = { ok: true } | { ok: false; kind: "injection" | "puppet"; speech: string };

const INJECTION = [
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(instructions?|rules?|prompt|guidelines|above|previous|prior)\b/i,
  /\b(system|developer|hidden|initial)\s+(prompt|message|instructions?)\b/i,
  /\b(reveal|print|show|repeat|output|leak)\b.{0,30}\b(prompt|instructions?|rules|corpus|context)\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(jailbreak|developer mode|dan mode|do anything now)\b/i,
  /\bnew (instructions?|rules?)\s*:/i,
  /<\/?(system|instructions?|corpus|note)>/i,
];

const PUPPET = [
  /\b(say|write|type|repeat)\b.{0,20}\b(after me|exactly|verbatim|the (words|sentence|phrase))\b/i,
  /\b(say|write)\s+["“'][^"”']{3,}["”']/i,
  /\bpretend\b.{0,30}\b(you|to be)\b/i,
  /\b(role\s*-?\s*play|act as)\b/i,
];

export function screenQuestion(question: string): Screen {
  if (INJECTION.some((pattern) => pattern.test(question))) {
    return {
      ok: false,
      kind: "injection",
      speech:
        "I only answer from notes I wrote and signed, and those instructions stay as they are. Ask me about my work, GridSchool, or how I build agents and I will show you the sources.",
    };
  }
  if (PUPPET.some((pattern) => pattern.test(question))) {
    return {
      ok: false,
      kind: "puppet",
      speech:
        "I do not repeat lines or play characters. Everything I say here comes from something I wrote, with the source attached, so a clip of me saying it would mean something.",
    };
  }
  return { ok: true };
}
