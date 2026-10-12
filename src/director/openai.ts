import { z } from "zod";
import { gatewayUrl, llmModel, openaiKey, type WorkerEnv } from "../lib/env";
import type { ProviderCall } from "./anthropic";
import type { HistoryTurn } from "./prompt";

function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json object");
  return JSON.parse(raw.slice(start, end + 1));
}

/** The original provider path, kept for anyone who forks the site with an OpenAI key. */
export async function callOpenAi<S extends z.ZodType>(
  env: WorkerEnv,
  opts: { system: string; history: HistoryTurn[]; user: string; schema: S },
): Promise<ProviderCall<z.infer<S>>> {
  const model = llmModel(env);
  const empty = { model, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const key = openaiKey(env);
  if (!key) return { ...empty, value: null, failure: "no_key" };

  const schemaHint = JSON.stringify(z.toJSONSchema(opts.schema));
  const response = await fetch(gatewayUrl(env) || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${opts.system}\n\nReturn one JSON object matching this schema:\n${schemaHint}` },
        ...opts.history.map((turn) => ({ role: turn.role === "visitor" ? "user" : "assistant", content: turn.text })),
        { role: "user", content: opts.user },
      ],
    }),
  }).catch(() => null);

  if (!response?.ok) return { ...empty, value: null, failure: `provider_${response?.status ?? "network"}` };
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const usage = { ...empty, inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 };
  try {
    return { ...usage, value: opts.schema.parse(extractJson(json.choices?.[0]?.message?.content || "{}")) };
  } catch {
    return { ...usage, value: null, failure: "unparsed" };
  }
}
