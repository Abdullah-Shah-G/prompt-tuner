export interface TestCase {
  id: string;
  label: string;
  inputs: Record<string, string>;
}

export interface RunResult {
  test_case_id: string;
  label: string;
  output: string;
  latency_ms: number;
  token_usage: number;
}

export interface ScoreBreakdown {
  correctness: number;
  relevance: number;
  concision: number;
  clarity: number;
  safety: number;
}

export interface EvaluationScore {
  candidate_id: string;
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

export interface PromptVersion {
  id: string;
  prompt: string;
  timestamp: number;
  avg_score: number;
  scores: EvaluationScore[];
  results: RunResult[];
}

export interface RunRequest {
  prompt_template: string;
  input_case: Record<string, string>;
  temperature?: number;
}

export interface BatchRunRequest {
  prompt_template: string;
  test_cases: TestCase[];
  temperature?: number;
}

export interface EvaluateRequest {
  task_description: string;
  reference: string;
  candidates: { id: string; output: string }[];
}

export interface CaseInput {
  variable: string;
  value: string;
}
