---
source: Aden / projects/map-builder.md
confidence: high
status: verified
last_updated: 2026-10-12
title: Map builder
---

The map builder is the GridSchool system that drafts a custom route for each student. It works from a library of modules. Given a student's goal, background, and current evidence, it picks and orders the modules into a route, and I review the draft before the student sees it.

The student's home on GridSchool is the map. Each capability is a node on a grid, and the nodes connect into the student's route. Only one node is open at a time, and there is always a clear next node. When I add a feature to GridSchool, it shows up as a new node on the map.

GridSchool routes get rebuilt from what happens. A rejection, a new target company, or an interview that went sideways changes the map. The map builder drafts the new route from the same module library, so the plan follows the student.

The map builder is a good example of how I use models. The model drafts a route from a constrained set of modules, so it cannot invent a module that does not exist. Deterministic checks validate the route, and a human reviews it. The model directs, and the structure keeps it honest.

My notes on why the map matters explain why I built GridSchool around a map in the first place.
