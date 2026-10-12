---
source: Aden / positions/cost-and-budgets.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: Cost and budgets in AI systems
---

Cost is part of the design of an AI system. A demo that goes viral and bankrupts the server is a design failure. Rate limits, daily spending ceilings, cached paths, and a product that still works when the model is off are product decisions I make at the start.

This site shows how I budget AI cost. Each visit gets five live questions to AI Aden, then the site switches to a free text-only mode. There is a daily dollar ceiling on model spend. Every answer shows what it cost, so the cost is visible to the visitor as well as to me.

Graceful degradation is part of the budget. When the budget runs out or the model is unavailable, this site still serves every page as plain HTML. The GridSchool AI setter falls back to a booking link if the calendar is unavailable. Every external dependency should have a path that still works.

Cheap deterministic work should come before expensive model calls. A parser, a graph query, or a BM25 search costs almost nothing and is easy to verify. I use those to narrow the problem and then spend model tokens only on the part that needs a model. GridSeak exists partly to stop agents from spending tokens rediscovering what a parser already knows.

When I evaluate an AI feature, I look at cost per useful answer alongside quality. A small model with good retrieval and a strict schema often beats a larger model with a vague prompt, at a fraction of the price.
