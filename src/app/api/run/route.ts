import { NextResponse } from "next/server";
import { runPrompt } from "@/lib/openai";
import type { RunRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: RunRequest = await request.json();
    const { prompt_template, input_case, temperature = 0.2 } = body;

    let prompt = prompt_template;
    for (const [key, value] of Object.entries(input_case)) {
      prompt = prompt.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
    }

    const { output, latency_ms, token_usage } = await runPrompt(prompt, temperature);

    return NextResponse.json({ output, latency_ms, token_usage });
  } catch (error: any) {
    console.error("Run error:", error);
    const msg = error?.message || error?.toString() || "";
    const isQuota = error?.status === 429 || error?.code === "insufficient_quota" || msg.includes("quota") || msg.includes("429");
    return NextResponse.json(
      { error: isQuota ? "API quota exceeded. Check your Gemini billing at https://aistudio.google.com." : "Failed to run prompt" },
      { status: isQuota ? 503 : 500 }
    );
  }
}
