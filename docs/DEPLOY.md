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
npm run build && npx wrangler deploy
```

Open the `*.workers.dev` URL it prints. Check `/`, `/resume`, `/projects`, `/ask` (ask should answer "not configured" or degrade, not 500).

## 2. Domain

Add `adenjessee.com` to a Cloudflare zone (Add site, Free plan). Cloudflare shows two nameservers.

At the registrar (Google Domains moved to Squarespace; log in there), replace the four `ns-cloud-d*.googledomains.com` nameservers with Cloudflare's two. Propagation: minutes to a few hours.

In the Worker: Settings, Domains and Routes, add custom domains `adenjessee.com` and `www.adenjessee.com`. Cloudflare provisions the certificate.

## 3. Retire the old site

In Vercel, remove the `adenjessee.com` / `www` domains from the v0 project (or delete the project). Otherwise the old site keeps serving for anyone with cached DNS and confuses search engines.

## 4. Search engines

Google Search Console: add the property, request indexing for `/`, `/resume`, `/projects`. The old "Visual Systems Architect / Demo Video Coming Soon" snippet is what currently ranks first for your name.

## 5. Embeddings (after the site is live)

```sh
npm run embed-kb
```

Only once `content/kb` is final for this round; re-run when it changes.

## Later, optional

- `public/models/aden.vrm` (docs/MODEL.md). The placeholder ships fine.
- ElevenLabs voice (docs/VOICE.md).
