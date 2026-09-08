import { gatewayUrl, llmModel, openaiKey, type WorkerEnv } from "../lib/env";
import { extractiveAnswer } from "../rag/localIndex";
import { toProvenance } from "../rag/provenance";
import { hasPosition } from "../rag/threshold";
import type { Retrieved } from "../rag/types";
import { pickRepresentation, systemPrompt, userPrompt } from "./prompt";
import { directorOutputSchema, type DirectorOutput } from "../scene/schema";

export type LlmResult = {
  output: DirectorOutput;
  usedLlm: boolean;
  inputTokens: number;
  outputTokens: number;
  provenance: ReturnType<typeof toProvenance>;
};

function fallbackOutput(question: string, hits: Retrieved[], noPosition: boolean): DirectorOutput {
  const extras = pickRepresentation(question);
  const extracted = extractiveAnswer(hits, 800);
  const speech = noPosition
    ? `I have not written down a firm view on that yet. Here is how I would reason from what I have signed. ${extracted || "I would start from evidence a stranger can check, then decide."}`
    : extracted || "I would start from evidence a stranger can check, then decide.";

  return directorOutputSchema.parse({
    speech,
    performance: {
      emotion: noPosition ? "thinking" : "serious",
      gesture: extras.gesture,
      lookAt: extras.scene[0] && "id" in extras.scene[0] ? (extras.scene[0] as { id?: string }).id || "visitor" : "visitor",
    },
    scene: extras.scene,
    noPosition,
  });
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json object");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function directAnswer(env: WorkerEnv, question: string, hits: Retrieved[]): Promise<LlmResult> {
  const noPosition = !hasPosition(hits);
  const provenance = toProvenance(hits);
  const key = openaiKey(env);
  if (!key) {
    return {
      output: fallbackOutput(question, hits, noPosition),
      usedLlm: false,
      inputTokens: 0,
      outputTokens: 0,
      provenance,
    };
  }

  const endpoint = gatewayUrl(env) || "https://api.openai.com/v1/chat/completions";
  const body = {
    model: llmModel(env),
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt(question, hits, noPosition) },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return {
      output: fallbackOutput(question, hits, noPosition),
      usedLlm: false,
      inputTokens: 0,
      outputTokens: 0,
      provenance,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  try {
    const parsed = directorOutputSchema.parse(extractJson(json.choices?.[0]?.message?.content || "{}"));
    return {
      output: parsed,
      usedLlm: true,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      provenance,
    };
  } catch {
    return {
      output: fallbackOutput(question, hits, noPosition),
      usedLlm: true,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      provenance,
    };
  }
}
