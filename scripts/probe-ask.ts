const questions = [
  "Why does graph engineering matter if AI can already read a repo?",
  "What is GridSchool?",
  "What is GridSeak?",
  "What is your favorite pizza topping?",
  "What's the difference between a junior using an agent and an excellent engineer using one?",
];

const base = process.env.ASK_URL || "http://127.0.0.1:4321/api/ask";

for (const question of questions) {
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const text = await response.text();
  const answerLine = text.split("\n").find((line) => line.includes('"type":"answer"'));
  const payload = answerLine ? JSON.parse(answerLine.slice(5).trim()) : { error: text.slice(0, 200) };
  const speech = payload.output?.speech ?? payload.message;
  console.log(`\nQ: ${question}\nA: ${speech}\nnoPosition=${payload.output?.noPosition} degraded=${payload.degraded}`);
}
