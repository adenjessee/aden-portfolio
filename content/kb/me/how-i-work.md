---
source: Aden / me/how-i-work.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: How I work
---

My working method starts with the structure of the system before I write anything. On a new codebase I map the callers, callees, and module boundaries of the area I am about to change, so I know the blast radius of the change first. GridSeak exists because I wanted that map to be cheap and repeatable.

I put deterministic checks in place before I bring in a model. That means tests, schemas, typed boundaries, and budgets. Once those exist, a language model is useful as a drafter, because its output lands inside something that can reject it. Without them, the model becomes the source of truth by default, and that is where most AI projects go wrong.

I work in small, reviewable changes. Each change should come with the check that would catch it if it were wrong. I write the pull request description so a reviewer can see what changed, what it reaches, and what I did not verify. I would rather ship a smaller change I can defend than a large one nobody can read.

My day to day as a solo founder covers the whole stack. I write the product code, run the deploys, answer student questions, review student work, and handle sales calls. That has made me fast at switching context and strict about writing things down, because the next person to read my notes is usually me a week later.

I use AI coding agents every day, and I check their work the way I would check a new teammate's. I read the diff, run the tests, and ask what the change touched that the agent did not mention. I describe that habit in more detail in my notes on AI coding tools.
