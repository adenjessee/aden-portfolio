/**
 * Pre-render the landing demo with ElevenLabs when credentials exist.
 * Otherwise writes a short silent WAV so the demo path has a file.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import landing from "../content/demos/landing.demo.json";

const outDir = join(new URL("..", import.meta.url).pathname, "public/audio/demo");
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, "landing.wav");

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID;

if (key && voice) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: landing.transcript,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
    }),
  });
  if (response.ok) {
    const mp3 = Buffer.from(await response.arrayBuffer());
    const mp3Path = join(outDir, "landing.mp3");
    await writeFile(mp3Path, mp3);
    console.log(`wrote ${mp3Path}`);
    process.exit(0);
  }
  console.log(`ElevenLabs failed (${response.status}). Writing silence.`);
}

const samples = 44100;
const buffer = Buffer.alloc(44 + samples * 2);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + samples * 2, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(44100, 24);
buffer.writeUInt32LE(88200, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(samples * 2, 40);
await writeFile(outFile, buffer);
console.log(`wrote silent ${outFile}. Record the PVC, set ELEVENLABS_*, rerun.`);
