# Deploy: replace the old adenjessee.com with this site

State on 2026-09-11: `adenjessee.com` DNS lives at Google Cloud DNS (`ns-cloud-d*.googledomains.com`) and `www` CNAMEs to Vercel, which serves the 2025 v0.app site. This repo builds clean (`npm run build`) and targets Cloudflare Workers. The AI path degrades gracefully when bindings are missing, so the site can go live before the VRM, voice, or Vectorize exist.

Everything below needs your logins; nothing here can be run by an agent.

## 1. Cloudflare (once)

```sh
npx wrangler login
npx wrangler kv namespace create SESSION
# paste the returned id into wrangler.jsonc -> kv_namespaces[0].id (replaces "replace-with-kv-namespace-id")
npx wrangler vectorize create aden-kb --dimensions=768 --metric=cosine
# dimensions must match the embedding model in src/rag/embed.ts; check before running
npx wrangler secret put ANTHROPIC_API_KEY   # the model; skip it and the site runs notes-only, free
npx wrangler secret put INBOX_TOKEN         # any long random string; you read messages with it
npm run build && npx wrangler deploy
```

Open the `*.workers.dev` URL it prints. Check `/`, `/resume`, `/notes`, `/evals`, and ask a question on `/ask`. The meter above the conversation says "Live · claude-opus-5-5" when the key works, or "Notes-only mode" when it is missing. `/api/health` shows which bindings the Worker sees.

Read messages people leave through AI Aden:

```sh
INBOX_TOKEN=<the same string> npm run inbox
```

## 2. Domain

Add `adenjessee.com` to a Cloudflare zone (Add site, Free plan). Cloudflare shows two nameservers.

At the registrar (Google Domains moved to Squarespace; log in there), replace the four `ns-cloud-d*.googledomains.com` nameservers with Cloudflare's two. Propagation: minutes to a few hours.

In the Worker: Settings, Domains and Routes, add custom domains `adenjessee.com` and `www.adenjessee.com`. Cloudflare provisions the certificate.

## 3. Retire the old site

In Vercel, remove the `adenjessee.com` / `www` domains from the v0 project (or delete the project). Otherwise the old site keeps serving for anyone with cached DNS and confuses search engines.

## 4. Search engines

Google Search Console: add the property, request indexing for `/`, `/resume`, `/projects`. The old "Visual Systems Architect / Demo Video Coming Soon" snippet is what currently ranks first for your name.

## 5. Embeddings (after the site is live)

Create an API token with **Workers AI: Read** and **Vectorize: Edit**, then:

```sh
CF_ACCOUNT_ID=<id> CF_API_TOKEN=<token> npm run embed-kb
```

Re-run whenever `content/kb` changes, after deploying, since the Worker reads note text from the bundled index and only takes the ranking from Vectorize. Retrieval works on BM25 alone until this runs.

## 6. Evals against the live model

```sh
ANTHROPIC_API_KEY=<key> npm run evals -- --llm
```

About $0.50. It writes `src/data/evals-llm.json`; commit it and redeploy, and `/evals` shows the model run next to the notes-only one.

## Later, optional

- `public/models/aden.vrm` (docs/MODEL.md). The placeholder ships fine.
- ElevenLabs voice (docs/VOICE.md).
