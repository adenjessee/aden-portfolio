# Architecture

The site is static HTML first. Cloudflare Workers serve the same deploy as `/api/*`. React exists only inside islands that hydrate after the page is useful.

```
Visitor
  -> Astro HTML (bio, work, receipts, resume)
  -> /ask island (text)
  -> capability check
       no WebGL / reduced motion / LinkedIn / low memory -> poster
       else lazy 3D (VRM + scene primitives)
  -> POST /api/ask
       rate limit -> session cap -> daily budget
       retrieve corpus (Vectorize or local index)
       director (LLM or extractive fallback)
       zod scene language
       optional /api/tts
```

## Modules

| Path | Job |
|---|---|
| `src/rag` | Chunk, retrieve, provenance, threshold |
| `src/guard` | Rate limit, session cap, budget |
| `src/director` | Prompt, provider adapter, structured output |
| `src/scene` | Schema, interpreter, primitives |
| `src/avatar` | VRM load, FSM, expressions, gaze, lip sync, capability |
| `src/voice` | ElevenLabs proxy, visemes |
| `src/telemetry` | Cost and degradation events |

Model IDs live in environment config. Adapters do not hardcode vendors.

## Scene language

The model may only emit commands in `src/scene/schema.ts`. Invalid JSON is dropped. The interpreter never `eval`s. That is the same contract as GridSeak tool calling: constrained language, cited evidence, no arbitrary code.
