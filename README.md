# Aden Jessee · portfolio

Employer-first personal site with **AI Aden**: an agent that answers for Aden from notes he wrote, cites them, draws how it found them, shows what each answer cost, and can take a message, set up a call, or check a job description against his work. The first paint is HTML. Every page works with JavaScript, WebGL, voice, and the model turned off.

This is also the GridSchool founder example. Students fork it.

## Contract

- Readable with JavaScript off. Every note the agent can cite is published at `/notes`.
- The model answers only from retrieved notes. Citations it was not given are dropped; citing nothing means "not on record".
- Placeholder notes (`status: mock`) are never stated as fact.
- The model fills a schema. It never emits code, and its actions are proposals the visitor confirms.
- Live questions are rate-limited and budget-capped; past the cap, answers stay free in notes-only mode.
- 33 eval cases (grounding, refusals, prompt injection, hard rules) run in `npm test` and publish at `/evals`.

Docs: [ARCHITECTURE](docs/ARCHITECTURE.md), [DEGRADATION](docs/DEGRADATION.md), [COST](docs/COST.md), [DEPLOY](docs/DEPLOY.md), [FORK-THIS](docs/FORK-THIS.md), [MODEL](docs/MODEL.md), [VOICE](docs/VOICE.md).

## Develop

```bash
npm install
npm run index-kb
npm run generate-og
npm run render-demo-audio
npm run dev
```

```bash
npm test
npm run test:e2e
npm run build
```

Local mode needs no API keys: answers come from the notes alone. Add `ANTHROPIC_API_KEY` to `.env` (see `.env.example`) for the live model.

```bash
npm run evals            # 33 cases, notes-only, free
npm run evals -- --llm   # the same cases against the configured model (~$0.50)
INBOX_TOKEN=... npm run inbox
```

Confirm `src/config/site.ts` before a public launch: LinkedIn slug, email, and domain. Those are editable placeholders.

## What you still do

1. Replace the `[MOCK …]` placeholders in `content/kb` (`/notes` lists them in red) and confirm the drafts.
2. `docs/DEPLOY.md`: Cloudflare login, KV and Vectorize, `ANTHROPIC_API_KEY` and `INBOX_TOKEN` secrets, deploy, move the domain.
3. Optional: `site.bookingUrl` in `src/config/site.ts` for a scheduling link (call requests go to the inbox until then).
4. Optional: export a VRoid VRM to `public/models/aden.vrm` (`docs/MODEL.md`) and train the voice (`docs/VOICE.md`).

## Stack

Astro, Cloudflare Workers, Claude via `@anthropic-ai/sdk`, BM25 + Vectorize with Workers AI embeddings, zod, React Three Fiber, `@pixiv/three-vrm`.
