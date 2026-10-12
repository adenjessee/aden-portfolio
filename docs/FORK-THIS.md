# Fork this

This repo is the GridSchool founder example of a personal site. The spectacle is optional. The receipts are not.

## What to replace

1. `src/config/site.ts`: your name, links, email, and optionally a booking link.
2. `content/projects/`: one markdown file per project. Every claim needs a URL.
3. `content/kb/`: first-person writing you will sign. Frontmatter: `source`, `confidence`, `status` (`verified`, `draft`, or `mock` for placeholders), `last_updated`, `title`. Write one topic per file and paragraphs that stand alone; retrieval works paragraph by paragraph.
4. `evals/cases.json`: change the expected notes to yours and add the questions people actually ask you. `npm test` runs them.
5. `src/styles/tokens.css` — your look. Keep one accent.
6. `public/models/aden.vrm` — export from VRoid Studio. Keep the filename or change `VRM_CANDIDATES`.
7. `public/og.png` and `public/avatar-poster.svg`.

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
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put INBOX_TOKEN
npm run build
npx wrangler deploy
```

Skip the model key and the site runs notes-only for $0. With it, set `DAILY_BUDGET_USD` to what you can afford on a viral day.

## What not to copy blindly

Do not paste a private psychological file into `content/kb`. If you have not written a public position, the avatar should say so.

Do not let the model emit JavaScript. The scene schema is the product. Do not let the voice read text a visitor typed.
