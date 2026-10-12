---
source: Aden / career/skills-and-stack.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: Skills and tech stack
---

My main programming language is TypeScript. Most of what I ship today is TypeScript on the server and in the browser, including GridSchool, the Hire engine, and this portfolio. I also write Python, mostly for data work, scripts, and analysis around models. [MOCK: other languages I have shipped in professionally, e.g. Java, C#, Go].

My web stack for recent projects is Astro for static-first sites, React where a page needs real interactivity, and Three.js through React Three Fiber for the 3D avatar on this site. I deploy on Cloudflare Workers, with Cloudflare's AI Gateway and Workers AI embeddings in the loop for this site's retrieval. I use Zod for schemas at the boundaries.

For data, I work in SQL and Postgres. GridSchool runs on a relational database. [MOCK: confirm hosting, e.g. managed Postgres provider].

My applied AI skills cover LLM APIs, including Anthropic's Claude and OpenAI models, structured output against a schema, tool calling for agents, retrieval (BM25 plus vector search with citations), and evals. I build evals as fixed question sets with expected behavior, and I publish them where I can. This site has a public evals page.

My graph engineering and developer tooling skills come from GridSeak. I build structural graphs of code from tree-sitter parses, grep, and the language server (LSP), and I write agent tools on top of them: callers, callees, blast radius, cycles, and module coupling.

Other tools I use: Git and GitHub with pull request review, Playwright for end-to-end tests, Vitest for unit tests, browser extension APIs for Apply Assist, and Claude Code as my daily coding agent. [MOCK: anything else Aden wants listed, e.g. Docker, AWS, specific cloud certifications].

If a visitor asks about a tool that is not listed here, AI Aden should say it is not in my notes. It should not assume I have used it.
