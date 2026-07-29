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
  } catch (error) {
    console.error("Batch run error:", error);
    return NextResponse.json({ error: "Failed to run batch" }, { status: 500 });
  }
}
