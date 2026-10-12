---
source: Aden / beliefs/engineering.md
confidence: high
status: verified
last_updated: 2026-10-12
title: Engineering beliefs
---

My core belief about software engineering is that it is the work of making a system understandable enough that the next change is safe. Writing code is part of that. Understanding what the code does, and what a change will reach, is most of it.

Generation is cheap and comprehension is expensive. A pull request that nobody can defend is unfinished work, however fast it was written. I judge my own changes by whether a reviewer could follow what changed, what it reaches, and how we would know if it were wrong.

I prefer deterministic methods wherever they exist: tests, schemas, graphs, typed boundaries, and budgets. A language model is useful after those are in place, because its output then lands inside something that can reject it. A model asked to be the source of truth is a liability.

I do not treat a greenfield tutorial as proof of engineering skill. Proof is something a stranger can open and check: a live system, a failing test that would have caught the bug, a graph of what a change touched, a review thread.

Small, reviewable changes beat large clever ones in my experience. Each change should carry the check that catches it if it is wrong. When I inherit a system, I map its structure before I touch it, and I write down what I could not verify.
