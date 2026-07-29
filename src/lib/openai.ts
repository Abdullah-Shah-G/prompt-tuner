import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export async function runPrompt(
  prompt: string,
  temperature = 0.2
): Promise<{ output: string; latency_ms: number; token_usage: number }> {
  const start = Date.now();
  const model = getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { maxOutputTokens: 500, temperature },
  });

  const result = await model.generateContent(prompt);
  const latency = Date.now() - start;
  const output = result.response.text() || "";
  const token_usage = Math.ceil(output.length / 4);

  return { output, latency_ms: latency, token_usage };
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

  const model = getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: EVALUATOR_SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 1000, temperature: 0 },
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text() || "";
}
