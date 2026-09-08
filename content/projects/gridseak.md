---
title: GridSeak
summary: A structural graph engine for codebases. Callers, callees, blast radius, cycles, and ranked risk, with evidence tiers so an agent cannot flatten a grep hit into a proven fact.
role: Founder / engineer
stack: [Rust, tree-sitter, MCP, TypeScript]
href: https://github.com/adenjessee/gridseak
repo: https://github.com/adenjessee/gridseak
receipts:
  - label: Public repo
    href: https://github.com/adenjessee/gridseak
featured: true
order: 1
---

GridSeak answers structural questions about a repository without asking a language model to rediscover the graph. It parses a call and import graph, then exposes tools an agent can query: who calls X, what X reaches, what breaks if this file changes, where the cycles are.

The point is not a prettier diagram. The point is deterministic local analysis that a model can cite by tier. Tree-sitter edges are not grep edges. Grep edges are not LSP edges. When an agent skips that distinction, it starts inventing confidence.

I use it as the structural layer under my own agent work, and I teach the same idea at GridSchool as nanograph: a student-sized version of the same contract.
