# Fork this

This repo is the GridSchool founder example of a personal site. The spectacle is optional. The receipts are not.

## What to replace

1. `src/config/site.ts` — your name, links, email.
2. `content/projects/` — one markdown file per project. Every claim needs a URL.
3. `content/kb/` — first-person writing you will sign. Frontmatter: `source`, `confidence`, `last_updated`.
4. `src/styles/tokens.css` — your look. Keep one accent.
5. `public/models/aden.vrm` — export from VRoid Studio. Keep the filename or change `VRM_CANDIDATES`.
6. `public/og.png` and `public/avatar-poster.svg`.

Then:

```bash
npm install
npm run index-kb
npm run dev
```

## Deploy for almost nothing

```bash
npx wrangler login
npx wrangler kv namespace create SESSION
npx wrangler vectorize create aden-kb --dimensions=768 --metric=cosine
npm run build
npx wrangler deploy
```

Skip voice and you can stay on the free Worker path plus, if required, Workers Paid for Vectorize.

## What not to copy blindly

Do not paste a private psychological file into `content/kb`. If you have not written a public position, the avatar should say so.

Do not let the model emit JavaScript. The scene schema is the product.
