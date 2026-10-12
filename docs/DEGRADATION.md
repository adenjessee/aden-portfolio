# Degradation

The site has to work when JavaScript, WebGL, audio, and the model are all unavailable.

| Failure | What the visitor gets |
|---|---|
| No JavaScript | Home, projects, resume, every note at `/notes`, the evals, and a short FAQ on `/ask` |
| LinkedIn in-app / no WebGL / reduced motion / low memory | Poster image; the conversation works the same |
| No model key | Notes-only mode: answers assembled from the best-matching sentences, with citations and the answer map |
| Model error, refusal, or bad output | The same notes-only answer for that question; the map labels it "notes only (model failed)" |
| Nothing in the notes clears the threshold | "I have not written down a position on that", plus an offer to leave a message |
| Visit's five live questions used | Notes-only mode, free, for the rest of the visit |
| Daily budget spent | Notes-only mode for everyone until midnight UTC; no TTS |
| Rate limit (10 a minute per IP) | A short error pointing to `/notes` |
| No ElevenLabs | Text only; `/api/tts` returns 204 |
| No Vectorize | BM25 alone; the evals pass on it |
| Missing VRM | Procedural stand-in, then the poster if WebGL is also gone |
| Worker down | Cloudflare still serves the prerendered pages |

Capability detection: `src/avatar/capability.ts`. Guards: `src/guard/pipeline.ts`. Fallback answers: `extractiveFallback` in `src/director/answer.ts`.
