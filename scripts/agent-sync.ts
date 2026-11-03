/**
 * Pushes AI Aden's configuration to the ElevenLabs agent: the prompt built from content/kb, the model,
 * your voice, call limits, and authentication. Re-run whenever the notes change.
 *
 *   npm run agent:sync
 *
 * Needs ELEVENLABS_AGENT_ID and an ELEVENLABS_API_KEY with the "ElevenLabs Agents" write permission.
 */
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const key = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
if (!key || !agentId || !voiceId) throw new Error("Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and ELEVENLABS_VOICE_ID (set -a; . ./.env).");

execSync("npx tsx scripts/agent-prompt.ts", { cwd: root, stdio: "inherit" });
const prompt = await readFile(join(root, "private/agent/prompt.md"), "utf8");

const config = {
  conversation_config: {
    agent: {
      first_message: "Hey, I'm Aden. Well, the AI version of me. What do you want to know?",
      language: "en",
      prompt: {
        prompt,
        // Fast first token matters more than depth in a live call; Haiku passes all 33 evals.
        llm: process.env.AGENT_LLM || "claude-haiku-5-5",
        temperature: 0.4,
      },
    },
    tts: {
      voice_id: voiceId,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_v4_turbo",
      stability: 0.45,
      similarity_boost: 0.8,
      speed: 1,
    },
    turn: { turn_eagerness: "normal", speculative_turn: true },
    // Five minutes a call keeps a single visitor from running up the bill.
    conversation: { max_duration_seconds: 300 },
  },
  platform_settings: {
    // Calls need a short-lived token from /api/live, so the agent id alone is useless to anyone else.
    auth: { enable_auth: true },
    call_limits: { agent_concurrency_limit: 5, daily_limit: Number(process.env.AGENT_DAILY_CALLS || 60) },
  },
};

const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: "PATCH",
  headers: { "xi-api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify(config),
});
if (!response.ok) throw new Error(`Agent update failed (${response.status}): ${await response.text()}`);
console.log(`Synced ${agentId}: ${prompt.length} chars of prompt, ${config.conversation_config.agent.prompt.llm}, voice ${voiceId}.`);
