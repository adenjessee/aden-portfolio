---
source: Aden / projects/gridseak.md
confidence: high
last_updated: 2026-09-04
title: GridSeak
---

GridSeak is a structural MRI for a repository. It builds a call and import graph from tree-sitter, grep, and the language server, then answers questions with those tiers intact.

Tools include callers, callees, blast radius, file-level blast radius, cycles, module coupling, and ranked recommendations. Every structural claim should name its tier. Flattening "GridSeak says" is a bug in the user of the tool.

I built it because agents waste context rediscovering what a parser already knows, and because they then speak as if a string match were a proven edge.
