---
source: Aden / positions/graph-engineering.md
confidence: high
last_updated: 2026-09-04
title: Graph engineering
---

Graph comprehension is becoming more valuable relative to code generation.

A model can write a function. It still cannot, by default, know which hidden edge will break at runtime, or which file is the blast radius of a refactor. That knowledge lives in the repository's actual structure.

Graph engineering is the practice of making that structure queryable: parse, store, retrieve, cite. Then you pack only the relevant slice into a context window. When I say "this is where the context window fails," I mean the model was asked to hold a graph it was never given.
