---
source: Aden / projects/gridseak.md
confidence: high
status: verified
last_updated: 2026-10-12
title: GridSeak
---

GridSeak is my open source code graph tool, at github.com/adenjessee/gridseak. I describe it as a structural MRI for a repository. It builds a local, deterministic graph of how the code fits together from three sources: tree-sitter parses, grep, and the language server (LSP).

GridSeak answers structural questions about a codebase through a set of tools: callers, callees, blast radius, file-level blast radius, cycles, module coupling, and ranked recommendations. An agent or an engineer can ask "what calls this function" or "what does changing this file reach" and get an answer from the graph instead of a guess.

Every structural claim in GridSeak names its evidence tier. An edge from a tree-sitter parse, an edge found by grep, and an edge confirmed by the language server carry different weight, and GridSeak keeps them separate. Flattening all of that into "GridSeak says" is a mistake by the user of the tool. A grep match is a lead, and an LSP-confirmed reference is much closer to proof.

I built GridSeak because coding agents waste context rediscovering what a parser already knows. An agent without a structural view opens files by keyword, burns tokens, and then reports success as if a string match were a proven edge. GridSeak gives the agent the structure first, so it can pack only the relevant slice of the repo into its context window and say how sure it is.

GridSeak is local and deterministic on purpose. The same repository gives the same graph every time, with no model in the loop and no code leaving the machine. That makes it safe to run on private code and easy to test.

At GridSchool I teach a student-sized version of GridSeak called nanograph. It keeps the same contract, parse, graph, query, and cite the tier, at a scale a student can build and defend in a few weeks.
