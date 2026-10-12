/**
 * Pulls the "speech" string out of a JSON object while the model is still writing it, so the voice
 * can start on the first sentence instead of waiting for the whole answer.
 */
export class SpeechExtractor {
  private emitted = 0;

  /** Feed the full text so far; returns the newly decoded speech characters. */
  feed(snapshot: string): string {
    const key = snapshot.match(/"speech"\s*:\s*"/);
    if (!key || key.index === undefined) return "";
    let i = key.index + key[0].length;
    let decoded = "";
    while (i < snapshot.length) {
      const ch = snapshot[i];
      if (ch === '"') break;
      if (ch === "\\") {
        const next = snapshot[i + 1];
        if (next === undefined) break; // escape split across deltas; wait for the rest
        if (next === "u") {
          const hex = snapshot.slice(i + 2, i + 6);
          if (hex.length < 4) break;
          decoded += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        decoded += next === "n" ? "\n" : next === "t" ? " " : next;
        i += 2;
        continue;
      }
      decoded += ch;
      i += 1;
    }
    const fresh = decoded.slice(this.emitted);
    this.emitted = decoded.length;
    return fresh;
  }
}

/**
 * Buffers text and releases whole sentences. Very short sentences are held and joined to the next
 * one, since each release becomes one text-to-speech request.
 */
export class SentenceSplitter {
  private buffer = "";

  constructor(private readonly minChars = 40) {}

  push(text: string): string[] {
    this.buffer += text;
    const out: string[] = [];
    const boundary = /[.!?…](?=["')\]]?\s)/g;
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = boundary.exec(this.buffer))) {
      const end = match.index + match[0].length;
      const candidate = this.buffer.slice(start, end).trim();
      if (candidate.length >= this.minChars) {
        out.push(candidate);
        start = end;
      }
    }
    this.buffer = this.buffer.slice(start);
    return out;
  }

  flush(): string[] {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest ? [rest] : [];
  }
}
