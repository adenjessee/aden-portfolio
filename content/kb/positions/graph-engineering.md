---
source: Aden / positions/graph-engineering.md
confidence: high
status: verified
last_updated: 2026-10-12
title: Graph engineering
---

Graph engineering is the practice of making a codebase's structure queryable: parse it, store it as a graph, retrieve from it, and cite where each fact came from. Agentic graph engineering is building agents that use that graph before they change anything.

My view is that understanding code through its graph is becoming more valuable relative to generating code. A model can write a function quickly. By default it still cannot tell which hidden edge will break at runtime, or which files sit in the blast radius of a refactor. That knowledge lives in the repository's actual structure.

Context windows fail in a predictable way on large codebases. The model is asked to reason about a graph it was never given. A graph lets you pack only the relevant slice into the context window: the function, its callers, its callees, and the modules it couples to. The agent spends tokens on the change instead of on rediscovery.

Evidence tiers are central to how I do graph engineering. An edge found by a tree-sitter parse, an edge found by grep, and an edge confirmed by the language server carry different weight. A good tool keeps them apart and says which tier backs each claim, so nobody treats a string match as a proven dependency.

GridSeak (github.com/adenjessee/gridseak) is my implementation of these ideas, and nanograph is the smaller version I teach at GridSchool. Both follow the same contract: deterministic structure first, then a model that reads it.
