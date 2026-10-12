// Reads messages visitors left through AI Aden.
// Usage: INBOX_TOKEN=... npm run inbox            (production, https://adenjessee.com)
//        INBOX_URL=http://127.0.0.1:4321 npm run inbox   (local dev)
const base = process.env.INBOX_URL || "https://adenjessee.com";
const token = process.env.INBOX_TOKEN;
if (!token) {
  console.error("Set INBOX_TOKEN (the same secret the Worker has: npx wrangler secret put INBOX_TOKEN).");
  process.exit(1);
}

type Message = { id: string; receivedAt: string; kind: string; name: string; email: string; company: string; message: string; transcript: { role: string; text: string }[] };

const response = await fetch(`${base}/api/inbox`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) {
  console.error(`Inbox request failed: ${response.status}`);
  process.exit(1);
}
const { count, messages } = (await response.json()) as { count: number; messages: Message[] };
console.log(`${count} message${count === 1 ? "" : "s"}\n`);
for (const m of messages) {
  console.log(`── ${m.receivedAt.slice(0, 16).replace("T", " ")}  ${m.kind === "book_call" ? "CALL REQUEST" : "message"}`);
  console.log(`   ${m.name} <${m.email}>${m.company ? ` · ${m.company}` : ""}`);
  console.log(`   ${m.message.replace(/\n/g, "\n   ")}`);
  if (m.transcript.length) {
    console.log("   context:");
    for (const turn of m.transcript.slice(-4)) console.log(`     ${turn.role === "visitor" ? "Q" : "A"}: ${turn.text.slice(0, 160)}`);
  }
  console.log("");
}
export {};
