---
source: Aden / projects/this-site.md
confidence: high
status: verified
last_updated: 2026-10-12
title: This portfolio and AI Aden
---

This portfolio site is static-first. Every page is readable without JavaScript, and the projects, notes, and resume load as plain HTML. The source is public at github.com/adenjessee/aden-portfolio. The 3D avatar, voice, and live answers load only after the page is already useful.

AI Aden is the avatar on this site. It answers questions in my voice, only from notes I wrote, and every answer cites the notes it used. If retrieval does not find a note above a confidence threshold, AI Aden says I have not written a position on that, rather than inventing one.

The model behind AI Aden fills a fixed schema. It never emits JavaScript or arbitrary code. Retrieval is lexical BM25 plus optional vector search over short chunks of my notes, and every answer shows the sources, a graph of how it was retrieved, and what the answer cost.

Cost on this site is bounded by design. Each visit gets five live questions, then the site switches to a free text-only mode. There is also a daily dollar ceiling on model spend. A public evals page shows how AI Aden performs on a fixed set of questions.

AI Aden can do three practical things. Visitors can leave me a message, book a call with me, or paste a job description for an honest fit check that lists the matches and the gaps with sources.

This portfolio is also the example site GridSchool students fork. It shows the standard I ask of them: evidence first, sources visible, costs bounded, and a site that still works when the model is off.
