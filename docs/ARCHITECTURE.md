# Architecture

The site is static HTML first. One Cloudflare Worker deploy serves the pages and `/api/*`. React exists only inside the `/ask` island.

```
Visitor
  -> Astro HTML: home, work, resume, /notes (every note AI Aden can cite), /evals
  -> /ask: full-screen avatar, a seven-line log, one input (src/components/Stage.tsx)
  -> /inspect: the same agent in text with sources, answer maps, cost meter and action cards
       capability check -> 3D VRM avatar, or the poster
       GET /api/status   -> meter: model, questions left, today's spend
       POST /api/ask (SSE, voice: true from /ask)
         rate limit (abuse only)
         budget and session cap -> live model, or free notes-only mode
         retrieve: BM25 + Workers AI vectors, rank-fused      -> event "retrieved" (the map draws)
         screen: injection and "say exactly" caught before any model
         director: Claude streams the wire schema; the "speech" field is read as it is written,
           split into sentences, and each sentence goes to ElevenLabs (PCM + character timings)
                                                              -> events "audio" (in order, as they arrive)
                                                              -> event "answer" (summary for the log)
           citations checked against what was retrieved
           scene, emotion, gesture, one optional action
         charge the budget with the real token cost
       POST /api/fit      job description -> requirement rows (match / partial / gap) with citations
       POST /api/message  visitor-confirmed message or call request -> KV inbox (30 days)
       POST /api/tts      speaks an answer by id, never arbitrary text
       GET  /api/inbox    Aden only, bearer INBOX_TOKEN
```

## Modules

| Path | Job |
|---|---|
| `content/kb` | The notes. Frontmatter: `source`, `confidence`, `status` (verified / draft / mock), `last_updated`, `title` |
| `src/rag` | Chunking, BM25 with bigram, title and written-question signals, vector fusion, provenance |
| `src/director` | System prompt, injection screen, wire schema, Claude and OpenAI adapters, the answer orchestrator, fit check |
| `src/guard` | Rate limit, session cap, daily budget, per-model cost table, KV store |
| `src/evals` | Grader and runner shared by `npm run evals` and `npm test` |
| `src/components` | Conversation, answer map (`TraceMap`), action cards, fit check, message form |
| `src/scene` | Scene language schema, interpreter, primitives |
| `src/avatar` | VRM load and framing, gesture FSM with a rest pose, expressions, gaze, lip sync |
| `src/voice` | ElevenLabs proxy, visemes |
| `src/telemetry` | Cost and degradation events to Analytics Engine |

## Voice and mouth

`SpeechPipeline` (`src/voice/ttsStream.ts`) streams the first sentence straight through and prefetches the next two, so audio starts after one sentence of model output plus one ElevenLabs round trip. The browser (`src/voice/player.ts`) schedules each 24 kHz PCM chunk on one AudioContext and turns the character timestamps into mouth shapes on the same clock; loudness from an analyser scales how open the mouth is. A new question interrupts the current answer. Without an ElevenLabs key, or once the day's budget is spent, the answer shows as a caption instead.

## Rules the code enforces

- **Grounding.** The model sees only retrieved notes, wrapped as data. A citation to a note the retriever did not return is dropped. An answer citing nothing is marked "not in Aden's notes".
- **Placeholders.** Notes with `status: mock` rank below real notes. The notes-only path never quotes a `[MOCK …]` sentence, the prompt forbids stating one, and the evals check both paths.
- **Structured output.** The model fills a flat schema (`src/director/wire.ts`). Enum fields arrive as strings and are coerced, so one odd value never throws away an answer. The model never emits code; the scene interpreter never evals.
- **Actions are proposals.** The model can suggest `book_call`, `leave_message` or `fit_check`. Nothing is sent until the visitor fills a form and presses the button.
- **Voice.** `/api/tts` takes an answer id stored for the asking session, plays it once, and refuses free text. A cloned voice that reads input is a deepfake endpoint.
- **Cost.** Every answer carries its token usage and dollar cost; the budget is charged with it. Past the cap, visitors keep getting free notes-only answers.

## Choosing a model

`LLM_MODEL` picks it; the default is `claude-opus-5-5` at low effort. `claude-haiku-5-5` costs about a fortieth as much per answer, with weaker judgment on borderline questions. Run `npm run evals -- --llm` against both before switching, and keep the one whose report you would publish.
