import { afterEach, describe, expect, it, vi } from "vitest";
import { callClaude } from "../src/director/anthropic";
import { fromWire, wireSchema, type Wire } from "../src/director/wire";
import { loadBundledChunks, scoreLocal } from "../src/rag/localIndex";

// No network: a fake Messages API that records the request and replies like the real one.
function fakeApi(reply: { text: string; stop_reason?: string }) {
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    return new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        content: [{ type: "text", text: reply.text }],
        stop_reason: reply.stop_reason ?? "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1800, output_tokens: 220, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
      }),
      { status: 200, headers: { "content-type": "application/json", "request-id": "req_test" } },
    );
  }) as typeof fetch;
  return { impl, requests };
}

describe("Claude adapter", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends a cached system prompt, a JSON schema, low effort and server-side fallbacks, and parses the reply", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("LLM_MODEL", "claude-opus-5-5");
    const hits = scoreLocal("What is GridSeak?", loadBundledChunks(), 4);
    const answer: Wire = {
      speech: "GridSeak is my code graph tool.",
      summary: "GridSeak, my code graph tool",
      citations: [hits[0].id],
      noPosition: false,
      emotion: "Serious",
      gesture: "point_left",
      visual: { kind: "graph", title: "Repository graph", left: null, right: null, items: null, code: null, text: null },
      action: { kind: "none", reason: null },
    };
    const api = fakeApi({ text: JSON.stringify(answer) });

    const result = await callClaude(undefined, { system: "sys", history: [], user: "q", schema: wireSchema, fetch: api.impl });

    expect(result.failure).toBeUndefined();
    expect(result.cacheReadTokens).toBe(900);
    const body = api.requests[0].body as {
      model: string;
      system: { cache_control?: unknown }[];
      output_config: { effort: string; format: { type: string } };
      fallbacks: unknown;
    };
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.output_config.effort).toBe("low");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.fallbacks).toBe("default");
    expect(api.requests[0].headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");

    const directed = fromWire(result.value!, hits);
    expect(directed.output.performance.emotion).toBe("serious");
    expect(directed.output.scene[0]).toMatchObject({ action: "showGraph" });
    expect(directed.citations).toEqual([hits[0].id]);
  });

  it("reports a refusal instead of parsing it", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const api = fakeApi({ text: "", stop_reason: "refusal" });
    const result = await callClaude(undefined, { system: "sys", history: [], user: "q", schema: wireSchema, fetch: api.impl });
    expect(result.value).toBeNull();
    expect(result.failure).toBe("refusal");
  });

  it("skips fallbacks on models that do not take them", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("LLM_MODEL", "claude-haiku-5-5");
    const api = fakeApi({ text: "{}" });
    await callClaude(undefined, { system: "sys", history: [], user: "q", schema: wireSchema, fetch: api.impl });
    expect(api.requests[0].body.fallbacks).toBeUndefined();
  });
});
