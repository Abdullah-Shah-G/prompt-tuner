import { NextResponse } from "next/server";
import { runPrompt } from "@/lib/openai";
import type { BatchRunRequest, RunResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: BatchRunRequest = await request.json();
    const { prompt_template, test_cases, temperature = 0.2 } = body;

    const results: RunResult[] = [];

    for (const tc of test_cases) {
      let prompt = prompt_template;
      for (const [key, value] of Object.entries(tc.inputs)) {
        prompt = prompt.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
      }

      const { output, latency_ms, token_usage } = await runPrompt(prompt, temperature);

      results.push({
        test_case_id: tc.id,
        label: tc.label,
        output,
        latency_ms,
        token_usage,
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Batch run error:", error);
    const isQuota = error?.status === 429 || error?.code === "insufficient_quota";
    return NextResponse.json(
      { error: isQuota ? "API quota exceeded. Check your OpenAI billing." : "Failed to run batch" },
      { status: isQuota ? 503 : 500 }
    );
  }
}
