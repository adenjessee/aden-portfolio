# Degradation

The site is required to work when JavaScript, WebGL, audio, and the model are all unavailable.

| Failure | What the visitor gets |
|---|---|
| No JavaScript | Full home, project pages, resume, and a text FAQ on `/ask` |
| LinkedIn in-app / no WebGL / reduced motion / low memory | Poster SVG, text chat still available |
| No LLM key | Extractive answers from the local corpus |
| Retrieval below threshold | "I have not written a firm view yet" plus open reasoning |
| Session 5 questions used | Cached answers and the static FAQ |
| Daily budget spent | Cached demo + text. No new TTS or LLM |
| Rate limit | Same cached path |
| No ElevenLabs | Text only. `/api/tts` returns 204 |
| Missing VRM | Procedural capsule stand-in, then poster if WebGL is also gone |
| Worker down | Cloudflare still serves the prerendered HTML |

Capability detection: `src/avatar/capability.ts`.

Guards: `src/guard/pipeline.ts`.
