---
title: This site
summary: AI Aden answers for me from notes I wrote, cites them, draws how each answer was found, shows what it cost, and can take a message or check a job description against my work. Every page still works with the model off.
role: Designer / engineer
stack: [Astro, Cloudflare Workers, Claude API, hybrid retrieval, evals, React Three Fiber]
href: https://github.com/adenjessee/aden-portfolio
repo: https://github.com/adenjessee/aden-portfolio
receipts:
  - label: Ask AI Aden
    href: /ask
  - label: The notes it answers from
    href: /notes
  - label: Evals
    href: /evals
  - label: Privacy
    href: /privacy
featured: true
order: 3
---

The first screen is ordinary HTML: name, work, receipts, resume. Nothing 3D or generative downloads before that page is readable, and LinkedIn's in-app browser gets a correct preview and a working page.

A question goes through a deterministic screen for prompt injection, then hybrid retrieval (BM25 plus Workers AI embeddings, fused by rank) over notes I wrote and published at /notes. Claude answers into a fixed schema: speech, citations, a scene for the avatar, and at most one suggested action. Citations the retriever never returned are dropped, and an answer that cites nothing is marked as having no position on record.

Each visit gets five live questions under a daily dollar ceiling. Past either limit, answers keep coming for free, assembled from the notes without a model. Thirty-three eval cases cover grounding, refusals, prompt injection, and hard rules, and the notes-only suite runs inside the test command.
