---
source: Aden / projects/ai-setter.md
confidence: high
status: verified
last_updated: 2026-10-12
title: AI appointment setter
---

The AI setter is an appointment-setting agent I built for GridSchool. When someone answers a GridSchool ad, the setter replies in chat, answers their questions about the residency, and books a call inside the conversation.

The AI setter books calls directly into my calendar from the chat. If the calendar is unavailable, for example because a calendar key cannot be read, the setter falls back to sending a booking link instead of failing. The lead always gets a way to book.

The setter has rules that keep it honest. It does not quote GridSchool's price, because the price is covered on the call. It does not promise a job. It also does not count the ad platform's automatic greeting as a reply from us, so the conversation state reflects what a person actually said.

I built the AI setter for the same reason I build the rest of GridSchool's systems. Answering leads quickly is busywork that matters, and a well-bounded agent can do it while I spend my time on student reviews. The setter is applied AI with a narrow job, clear limits, and a fallback for every external dependency.
