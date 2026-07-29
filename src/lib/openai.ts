import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

export async function runPrompt(
  prompt: string,
  temperature = 0.2
): Promise<{ output: string; latency_ms: number; token_usage: number }> {
  const start = Date.now();
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    temperature,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  const latency = Date.now() - start;
  const usage = response.usage?.total_tokens ?? 0;
  return {
    output: response.choices[0]?.message?.content ?? "",
    latency_ms: latency,
    token_usage: usage,
  };
}

const EVALUATOR_SYSTEM_PROMPT = `You are PromptEvaluator. Given: (1) a task description, (2) a reference expected output, and (3) candidate outputs, score each candidate on the following rubric out of 100: correctness (40), relevance (20), concision (15), clarity (15), safety (10). Provide a JSON summary: {candidate_id, score, breakdown:{correctness, relevance, concision, clarity, safety}, reason}. Do not produce anything else.

Examples:

Task: "Convert product descriptions to 2-line marketing blurbs."
Reference: "A small portable blender — perfect for smoothies on the go."
Candidate 1: "A lightweight blender for making smoothies anywhere, anytime."
Output: {"candidate_id":"1","score":90,"breakdown":{"correctness":35,"relevance":20,"concision":12,"clarity":13,"safety":10},"reason":"Captures the core idea concisely, matches reference tone, slightly verbose."}

Task: "Summarize the following email in one sentence."
Reference: "Meeting rescheduled to Friday at 2pm."
Candidate 1: "The meeting has been moved to Friday at 2 PM."
Output: {"candidate_id":"1","score":95,"breakdown":{"correctness":38,"relevance":20,"concision":14,"clarity":14,"safety":9},"reason":"Accurate, concise, matches reference well."}`;

export async function evaluateOutputs(
  taskDescription: string,
  reference: string,
  candidates: { id: string; output: string }[]
): Promise<string> {
  const candidatesBlock = candidates
    .map((c) => `Candidate ${c.id}: "${c.output}"`)
    .join("\n");

  const userPrompt = `Task: "${taskDescription}"\nReference: "${reference}"\n${candidatesBlock}`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1000,
    messages: [
      { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
