import { describe, expect, it } from "vitest";
import { interpretDirector } from "../src/scene/runtime";
import { safeParseDirectorOutput } from "../src/scene/schema";

describe("scene language", () => {
  it("accepts a valid director payload", () => {
    const parsed = safeParseDirectorOutput({
      speech: "Graph comprehension is becoming more valuable relative to code generation.",
      performance: { emotion: "serious", gesture: "point_left", lookAt: "repositoryGraph" },
      scene: [
        { action: "showGraph", id: "repositoryGraph", title: "Repo", position: "avatarLeft" },
        { action: "highlight", target: "hiddenDependency" },
      ],
      noPosition: false,
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects arbitrary javascript fields by ignoring them and failing unknown actions", () => {
    const parsed = safeParseDirectorOutput({
      speech: "hi",
      performance: { emotion: "neutral", gesture: "idle", lookAt: "visitor" },
      scene: [{ action: "eval", code: "window.location = 'https://evil'" }],
    });
    expect(parsed.ok).toBe(false);
  });

  it("never throws on random junk", () => {
    const junk = [null, 1, "nope", { scene: "boom" }, { speech: "", scene: [{ action: "spawn" }] }, { foo: [] }];
    for (const raw of junk) {
      expect(() => interpretDirector(raw)).not.toThrow();
      const result = interpretDirector(raw);
      expect(result.output).toBeNull();
      expect(result.error).toBeTruthy();
    }
  });

  it("fuzzes 50 invalid scene arrays without throwing", () => {
    for (let i = 0; i < 50; i += 1) {
      const raw = {
        speech: "x".repeat((i % 5) + 1),
        performance: { emotion: "neutral", gesture: "idle", lookAt: "visitor" },
        scene: [{ action: ["explode", "hack", "spawn"][i % 3], id: i, position: "nowhere" }],
      };
      expect(() => interpretDirector(raw)).not.toThrow();
    }
  });
});
