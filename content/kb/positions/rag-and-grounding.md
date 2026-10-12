---
source: Aden / positions/rag-and-grounding.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: RAG and grounding
---

Retrieval-augmented generation, or RAG, is how I ground a model in facts it would otherwise invent. The model answers from retrieved sources, cites them, and refuses when the sources do not cover the question. Grounding only works if all three parts hold.

AI Aden on this site is my clearest RAG example. Retrieval is lexical BM25 plus optional vector search over short chunks of notes I wrote. If no chunk scores above a threshold, AI Aden says I have not written a position on that. Every answer shows its sources and a graph of how they were retrieved.

I start retrieval with lexical search like BM25 because it is cheap, deterministic, and easy to debug. You can see exactly why a chunk matched. Vector embeddings help with paraphrases, and I add them as a second signal rather than the only one. The same instinct drives GridSeak: deterministic structure first, fuzzy methods after.

The quality of a RAG system depends mostly on the source documents. Each chunk should stand on its own, name its subject, and use the words a reader would actually search for. Most RAG failures I have seen come from bad chunks and missing documents more than from the model.

The refusal path matters as much as the answer path. A grounded system that sounds confident when it found nothing is worse than no system. I test the refusal behavior in evals the same way I test correct answers.
