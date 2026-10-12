---
source: Aden / positions/ai-agents.md
confidence: high
status: verified
last_updated: 2026-10-12
title: AI agents
---

An AI agent without a structural view of the repository behaves like a tourist. It opens files by keyword, burns tokens, and reports success in the confident tone of a senior engineer. The confidence has nothing to do with whether the change is right.

The difference between a junior using an agent and an excellent engineer using one is what happens after the output. The excellent engineer asks whether the change was verified, what it missed, and what a graph of the code would have shown before the money was spent. That loop after the output is where the value is.

The agents I build call tools that return evidence, and they report which tier of evidence backs each claim. I would rather an agent say "grep found three call sites, the language server confirmed two" than narrate a story about the code. Agent output should be constrained and validated. In my systems, the model fills a schema or calls a typed tool, and it does not emit arbitrary code into a production path.

I also give agents narrow jobs with clear limits. The GridSchool AI setter books calls and never quotes a price. Apply Assist fills applications and never submits. The Hire engine never touches a student's LinkedIn. A narrow agent with a fallback is far easier to trust than a general one.

My view on agents and trust: a team should be able to check what an agent did before it trusts the change. That means a diff a person can read, a test that would catch the defect, and a structural map of what the change reaches.
