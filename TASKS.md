# Tasks

What's left to make AI Aden top tier, in priority order. **Owner** says who unblocks it: *Aden* (needs your accounts, voice, face or judgment), *Claude* (I can do it in a session), *Both* (you decide or supply, I build). Update the status as things land.

## P0. Before it goes public

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Review `private/review/facts.md` (344 facts from your prompt corpus): tick what's true and public, fix wording | Aden | todo | 20 to 40 minutes. Fastest way to replace the `[MOCK]` career notes. |
| 2 | `npm run ingest -- promote`, then fold the bullets into prose and mark notes verified | Both | todo | Tell Claude "promote and write up the reviewed facts". |
| 3 | Replace every `[MOCK …]` in `content/kb` (timeline, experience, location and availability, compensation, client work, interests) | Aden | todo | /notes shows them in red. Answer the questions in one sitting with Claude. |
| 4 | Your voice: Instant Voice Clone today, then a Professional Voice Clone | Aden | todo | docs/VOICE.md. The recording session doubles as interview content. |
| 5 | Listen to the six A/B samples; decide on audio tags | Aden | todo | If yes, Claude enables tags in the prompt and strips them from the log. |
| 6 | Add the **Speech to Text** permission to the ElevenLabs key, then set `STT_PROVIDER=elevenlabs` | Aden | todo | Until then the mic uses the browser's recognition (Chrome, Safari, Edge; not Firefox). |
| 7 | Deploy: Cloudflare login, KV + Vectorize, secrets (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `INBOX_TOKEN`), domain move | Aden, then Claude | todo | docs/DEPLOY.md. Then `npm run embed-kb`. |
| 8 | Push `launch-ready` and open a PR | Claude | todo | Say the word. |
| 9 | Disclosure line on /ask: "AI voice and avatar of Aden, answering from his notes" | Both | todo | Required for a cloned voice; also honest. Small, one line, near the input. |

## P1. Quality

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 10 | TRON-suit avatar: photos → concept images → VRoid build or commission → refinement loop | Both | todo | docs/MODEL.md. Send Claude 4 to 6 photos to start concepts. |
| 11 | LinkedIn export → `npm run ingest -- linkedin` | Aden, then Claude | todo | The export takes up to a day to arrive. |
| 12 | ChatGPT export → `npm run ingest -- chatgpt` | Aden, then Claude | todo | Under $1 even for a big history. |
| 13 | Gap log: record questions that got "not in my notes" (question text only, no identity, 30 days) so you know what to write next | Claude | todo | Needs a privacy-page line. Highest-value feedback loop. |
| 14 | Tune `voice_settings` (stability, similarity) on your clone | Both | todo | By ear, after task 4. |
| 15 | Blind listening test: your PVC on ElevenLabs vs Hume Octave 2 | Both | later | Only if the PVC still sounds synthetic. One new `streamSentence` implementation. |
| 16 | Compress the avatar to under 8 MB; cache it hard at the edge | Both | todo | The sample is 10 MB and takes about 8 s. |
| 17 | Answer cache for the 20 most common questions (text + audio) | Claude | todo | Cuts cost and makes the usual questions instant. |
| 18 | Real-time voice turn-taking (talk over it naturally, no button) | Claude | later | Voice activity detection on the mic plus barge-in; or an ElevenLabs Agent pointed at /api/ask. |

## P2. Polish and hardening

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| 19 | Mixamo/VRMA animations: idle breathing, talking hands, nod | Claude | later | After the real model exists. |
| 20 | Atomic budget counter (Durable Object) instead of KV read-then-write | Claude | later | Only matters under real traffic. |
| 21 | Budget alert: email when the day passes 80% | Both | later | Cloudflare Email Routing or a cron Worker. |
| 22 | OG image and poster from the real avatar | Claude | todo | After task 10. |
| 23 | Mobile Safari pass: audio unlock, mic permission, safe areas | Both | todo | Needs your phone. |
| 24 | Retire or refresh the sample-model placeholder before launch | Both | todo | Covered by task 10. |

## Done (this branch)

- Notes rewritten and expanded (39 notes), all claims cited, placeholders bracketed and never stated
- Hybrid retrieval, Claude Haiku 5.5 streaming, citation checking, injection screen, 33 evals (pass in both modes)
- /ask: full-screen avatar, 7-line log, input, mic; streamed voice (ElevenLabs v4 Turbo) with lip sync
- /inspect: sources, answer maps, cost meter, actions (message, call request, job-fit check)
- TRON stage: grid floor, rim light, emissive-only bloom, load progress
- Knowledge intake pipeline with privacy gates and a review step; first corpus run done
- Clean-up: one model interface, one voice path, a testable ask turn, dead code removed, e2e rewritten
