---
source: Aden / positions/evals-and-verification.md
confidence: medium
status: draft
last_updated: 2026-10-12
title: Evals and verification
---

Evals are how I know whether an AI feature works. An eval is a fixed set of inputs with expected behavior, run every time the prompt, the model, or the data changes. Without evals, every change to an AI system is a guess that happens to look fine in a demo.

The evals I write test behavior I can state plainly. For AI Aden on this site, that includes: does it cite a real note, does it refuse when no note covers the question, does it stay in my voice, does it avoid quoting a GridSchool price or promising a job. This site publishes those results on a public evals page.

Verification comes before evals in my order of work. Deterministic checks catch most failures cheaply: schemas reject malformed output, typed boundaries reject wrong shapes, budgets stop runaway spend, and tests catch regressions in the code around the model. Evals then measure the part that only a model can get wrong.

For code changes made by an agent, verification means a test that would have caught the defect, a readable diff, and a map of what else the change reaches. At GridSchool, every student's reviewed change has to include the check that catches the defect. If you cannot show how you would know you were wrong, the change is not done.

I also try to say what my numbers cannot prove. A passing eval set shows the system handles those questions. It does not show it handles the next question nobody wrote down. GridSchool case studies have a section for exactly that, and I hold my own work to it.
