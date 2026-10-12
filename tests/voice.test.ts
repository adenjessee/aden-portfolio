import { afterEach, describe, expect, it, vi } from "vitest";
import { SentenceSplitter, SpeechExtractor } from "../src/director/speechStream";
import { SpeechPipeline } from "../src/voice/ttsStream";

describe("speech streaming", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("pulls the speech string out of half-written JSON, escapes included", () => {
    const full = JSON.stringify({ speech: 'I build "graph" tools.\nThey help.', summary: "x" });
    const extractor = new SpeechExtractor();
    let out = "";
    for (let i = 1; i <= full.length; i += 3) out += extractor.feed(full.slice(0, i));
    out += extractor.feed(full);
    expect(out).toBe('I build "graph" tools.\nThey help.');
  });

  it("releases whole sentences and holds short ones for the next", () => {
    const splitter = new SentenceSplitter(30);
    expect(splitter.push("Hi. I build graph tools for codebases. And")).toEqual(["Hi. I build graph tools for codebases."]);
    expect(splitter.push(" agents that use them. Done")).toEqual([]);
    expect(splitter.flush()).toEqual(["And agents that use them. Done"]);
  });

  it("speaks sentences in order with their alignment, prefetching the next", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "xi-test");
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const { text } = JSON.parse(String(init.body)) as { text: string };
        requested.push(text);
        const line = (audio: string, chars: string[]) =>
          JSON.stringify({
            audio_base64: audio,
            alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.05), character_end_times_seconds: chars.map((_, i) => i * 0.05 + 0.05) },
          });
        const body = `${line(btoa(`${text}-a`), [...text.slice(0, 3)])}\n${line(btoa(`${text}-b`), [])}\n`;
        return new Response(body, { status: 200 });
      }),
    );

    const events: { index: number; audio: string }[] = [];
    const pipeline = new SpeechPipeline(undefined, (e) => events.push({ index: e.index, audio: atob(e.audio) }));
    pipeline.push("First sentence.");
    pipeline.push("Second sentence.");
    pipeline.push("Third sentence.");
    const result = await pipeline.finish();

    expect(result.failure).toBeNull();
    expect(new Set(requested)).toEqual(new Set(["First sentence.", "Second sentence.", "Third sentence."]));
    expect(requested).toHaveLength(3);
    expect(events.map((e) => e.audio)).toEqual([
      "First sentence.-a",
      "First sentence.-b",
      "Second sentence.-a",
      "Second sentence.-b",
      "Third sentence.-a",
      "Third sentence.-b",
    ]);
    expect(result.characters).toBe("First sentence.Second sentence.Third sentence.".length);
  });

  it("reports an ElevenLabs failure instead of hanging", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "xi-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 401 })));
    const pipeline = new SpeechPipeline(undefined, () => undefined);
    pipeline.push("Hello there, this is a test.");
    const result = await pipeline.finish();
    expect(result.failure).toBe("elevenlabs_401");
  });
});
