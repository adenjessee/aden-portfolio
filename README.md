# Aden Jessee · portfolio

Employer-first personal site. The first paint is HTML: name, work, receipts, resume. AI Aden, voice, and the 3D scene load later, and only if the visitor asked and the browser can take them.

This is also the GridSchool founder example. Students fork it. Shy students can stop at the static page. The architecture is the same either way.

## Contract

- Readable with JavaScript off.
- Nothing 3D or generative downloads before the page is useful.
- The model answers from a curated corpus. No position on record means it says so.
- The model never emits JavaScript. It fills a scene schema.
- Live questions are rate-limited and budget-capped.

Docs: [ARCHITECTURE](docs/ARCHITECTURE.md), [DEGRADATION](docs/DEGRADATION.md), [COST](docs/COST.md), [FORK-THIS](docs/FORK-THIS.md), [MODEL](docs/MODEL.md), [VOICE](docs/VOICE.md).

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

Local mode needs no API keys. Retrieval is lexical over `content/kb`. Add `.env` from `.env.example` for LLM and voice.

Confirm `src/config/site.ts` before a public launch: LinkedIn slug, email, and domain. Those are editable placeholders.

## What you still do

1. Export a VRoid VRM to `public/models/aden.vrm` (`docs/MODEL.md`).
2. Record ~30 minutes and train the ElevenLabs clone (`docs/VOICE.md`).
3. `npx wrangler login`, create the KV namespace and Vectorize index, replace the placeholder IDs in `wrangler.jsonc`, then `npx wrangler deploy`.
4. Point a domain when you have one. The config currently names `adenjessee.dev`.

## Stack

Astro, Cloudflare Workers, React Three Fiber, `@pixiv/three-vrm`, zod, Vectorize (production), Workers AI embeddings (production).
