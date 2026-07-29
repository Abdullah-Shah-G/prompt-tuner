"use client";

import { useState, useCallback } from "react";
import type { TestCase, RunResult, EvaluationScore, PromptVersion } from "@/lib/types";
import PromptEditor from "@/components/prompt-editor";
import TestCases from "@/components/test-cases";
import ResultsGrid from "@/components/results-grid";
import EvaluationPanel from "@/components/evaluation-panel";
import ComparisonView from "@/components/comparison-view";
import PromptLeaderboard from "@/components/prompt-leaderboard";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [results, setResults] = useState<RunResult[]>([]);
  const [scores, setScores] = useState<Map<string, EvaluationScore>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [running, setRunning] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [batchScore, setBatchScore] = useState<{ total: number; avg: number } | null>(null);

  const variables = Array.from(new Set(prompt.match(/\{\{(\w+)\}\}/g)?.map((v) => v.slice(2, -2)) || []));

  const selectedResult = results.find((r) => r.test_case_id === selectedId) ?? null;
  const selectedScore = selectedId ? scores.get(selectedId) ?? null : null;

  async function handleRun() {
    if (!prompt.trim()) return;
    setRunning(true);
    setResults([]);
    setScores(new Map());
    setBatchScore(null);

    try {
      const res = await fetch("/api/batch-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_template: prompt, test_cases: testCases, temperature: 0.2 }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      console.error("Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleEvaluate() {
    if (!selectedResult || !reference.trim()) return;
    setEvaluating(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_description: prompt.slice(0, 200),
          reference,
          candidates: [{ id: selectedResult.test_case_id, output: selectedResult.output }],
        }),
      });
      const data = await res.json();
      if (data.scores?.length > 0) {
        setScores((prev) => {
          const next = new Map(prev);
          next.set(selectedResult.test_case_id, data.scores[0]);
          return next;
        });
      }
    } catch {
      console.error("Evaluate failed");
    } finally {
      setEvaluating(false);
    }
  }

  async function handleBatchEval() {
    if (results.length === 0 || !reference.trim()) return;
    setEvaluating(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_description: prompt.slice(0, 200),
          reference,
          candidates: results.map((r) => ({ id: r.test_case_id, output: r.output })),
        }),
      });
      const data = await res.json();
      if (data.scores) {
        const newScores = new Map(scores);
        let total = 0;
        data.scores.forEach((s: EvaluationScore) => newScores.set(s.candidate_id, s));
        data.scores.forEach((s: EvaluationScore) => (total += s.score));
        setScores(newScores);
        setBatchScore({ total, avg: total / data.scores.length });
      }
    } catch {
      console.error("Batch eval failed");
    } finally {
      setEvaluating(false);
    }
  }

  function handleSaveVersion() {
    const allScoreValues = Array.from(scores.values());
    const avgScore = allScoreValues.length > 0
      ? allScoreValues.reduce((a, s) => a + s.score, 0) / allScoreValues.length
      : 0;

    const version: PromptVersion = {
      id: String(Date.now()),
      prompt,
      timestamp: Date.now(),
      avg_score: avgScore,
      scores: allScoreValues,
      results,
    };

    setVersions((prev) => [...prev, version].sort((a, b) => b.avg_score - a.avg_score));
  }

  function handleRestore(v: PromptVersion) {
    setPrompt(v.prompt);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Prompt Tuner</h1>
        <p className="subtitle">Write, test, and tune prompts with automated scoring</p>
      </header>

      <div className="app-grid">
        <div className="left-panel">
          <PromptEditor value={prompt} onChange={setPrompt} variables={variables} />
          <TestCases variables={variables} testCases={testCases} onChange={setTestCases} />

          <div className="action-bar">
            <button className="run-btn" onClick={handleRun} disabled={running || !prompt.trim() || testCases.length === 0}>
              {running ? "Running..." : `Run ${testCases.length} test(s)`}
            </button>
            <button className="eval-btn-secondary" onClick={handleBatchEval} disabled={evaluating || results.length === 0 || !reference.trim()}>
              {evaluating ? "Evaluating..." : "Evaluate All"}
            </button>
          </div>

          {batchScore && (
            <div className="batch-score">
              Avg score: <strong>{batchScore.avg.toFixed(1)}</strong> / 100
              across {results.length} outputs
            </div>
          )}

          <ResultsGrid
            results={results}
            scores={scores}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="right-panel">
          <EvaluationPanel
            result={selectedResult}
            score={selectedScore}
            reference={reference}
            onReferenceChange={setReference}
            onEvaluate={handleEvaluate}
            loading={evaluating}
          />

          <ComparisonView results={results} scores={scores} />

          <div className="save-section">
            <button className="save-btn" onClick={handleSaveVersion} disabled={results.length === 0}>
              Save Current Prompt
            </button>
          </div>

          <PromptLeaderboard
            versions={versions}
            onRestore={handleRestore}
            onClear={() => setVersions([])}
          />
        </div>
      </div>
    </div>
  );
}
