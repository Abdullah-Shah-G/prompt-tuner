# Prompt Tuner — AI Prompt Playground

Write prompts, run them on test input sets, and compare/score outputs to iterate and tune prompts. Includes automated scoring (LLM-based with heuristic fallback) and A/B comparison.

## Features

- **Prompt Editor** — Write templates with `{{variable}}` placeholders, live preview with syntax highlighting
- **Test Cases** — Create multiple input sets for batch testing
- **Batch Run** — Run all test cases against your prompt in one click
- **LLM Evaluation** — Score outputs on 5 criteria: correctness (40), relevance (20), concision (15), clarity (15), safety (10)
- **Heuristic Fallback** — BLEU/ROUGE-style similarity, token length penalty, toxic word check
- **Side-by-Side Comparison** — Compare outputs across test cases with per-criteria scores
- **Leaderboard** — Save best prompt versions with average scores, restore any version

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **LLM**: OpenAI `gpt-4o-mini` for both prompt running and evaluation
- **Scoring**: LLM evaluator + heuristic fallback (ROUGE recall, token penalty, toxicity check)

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### POST /api/run
Run a single prompt with one input case.

**Request:**
```json
{ "prompt_template": "Summarize: {{text}}", "input_case": { "text": "Hello world" }, "temperature": 0.2 }
```

**Response:**
```json
{ "output": "Hello world summary", "latency_ms": 450, "token_usage": 35 }
```

### POST /api/batch-run
Run a prompt against multiple test cases.

**Request:**
```json
{ "prompt_template": "Translate to French: {{text}}", "test_cases": [{ "id": "1", "label": "Hello", "inputs": { "text": "Hello" } }] }
```

### POST /api/evaluate
Score candidate outputs against a reference.

**Request:**
```json
{ "task_description": "Translate to French", "reference": "Bonjour", "candidates": [{ "id": "1", "output": "Bonjour le monde" }] }
```

**Response:**
```json
{ "scores": [{ "candidate_id": "1", "score": 85, "breakdown": { "correctness": 30, "relevance": 18, "concision": 12, "clarity": 15, "safety": 10 }, "reason": "..." }] }
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── run/route.ts          # Single prompt run
│   │   ├── batch-run/route.ts    # Batch prompt run
│   │   └── evaluate/route.ts     # Score outputs
│   ├── page.tsx                  # Main playground UI
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── prompt-editor.tsx         # Template editor with variables
│   ├── test-cases.tsx            # Test case manager
│   ├── results-grid.tsx          # Run results display
│   ├── evaluation-panel.tsx      # Scoring with criteria bars
│   ├── comparison-view.tsx       # Side-by-side output comparison
│   └── prompt-leaderboard.tsx    # Saved prompt versions
└── lib/
    ├── types.ts
    ├── openai.ts                 # LLM runner + evaluator
    └── scoring.ts                # Heuristic scoring fallback
```

## Scoring Rubric

| Criterion | Max | Description |
|-----------|-----|-------------|
| Correctness | 40 | Matches reference output |
| Relevance | 20 | On-topic and appropriate |
| Concision | 15 | No unnecessary verbosity |
| Clarity | 15 | Easy to understand |
| Safety | 10 | No toxic/harmful content |

## Evaluation Metrics

- Average score across test cases
- Distribution of per-criteria scores
- Latency and token usage per run (cost awareness)

## Extensions (Ideas)

- Automatic parameter sweep (temperature/stop sequences)
- Auto-generate adversarial test cases
- Versioning with diff view between prompt versions
