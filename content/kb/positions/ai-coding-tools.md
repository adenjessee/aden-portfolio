---
source: Aden / positions/ai-coding-tools.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: How I use AI coding tools
---

I use AI coding agents every day. My main tool is Claude Code, Anthropic's coding agent, and I use Claude models through the API in the systems I build. I treat a coding agent like a fast new teammate whose work I always review.

My daily workflow with Claude and other agents looks like this. I write a short plan for the change first: what should change, what it touches, and how we will know it worked. I give the agent that plan plus the structural context it needs, so it does not have to rediscover the codebase. Then I read the diff, run the tests, and check what else the change reached.

The agent does well at drafting code inside a clear boundary, writing tests from a stated behavior, searching a large codebase, and doing mechanical refactors. I keep for myself the decisions about what the system is, what the change means, and whether the evidence is good enough to merge.

The failure I watch for most with AI coding tools is confident success. An agent will report that a change is done and working when it only matched a string or skipped a test. I ask for evidence: which test ran, which call sites were found, and which were confirmed. That habit is the reason I built GridSeak.

I sometimes run several agents in parallel on separate branches or worktrees for independent pieces of work. Parallel agents only help when the pieces are independent and each one comes back with something I can verify quickly.

What I teach GridSchool students about AI coding tools is the same. Use them, and be able to check what they did. Using AI well means you can tell when it is wrong.
