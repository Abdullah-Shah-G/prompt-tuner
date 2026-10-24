import re
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field, ValidationError

from chain import run_prompt, evaluate_outputs, heuristic_score

app = FastAPI(title="Prompt Tuner")
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class RunRequest(BaseModel):
    prompt_template: str = Field(min_length=1, max_length=20000)
    input_case: dict[str, str]
    temperature: float = Field(default=0.2, ge=0, le=2)


class TestCase(BaseModel):
    id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    inputs: dict[str, str] = Field(default_factory=dict)
    label: str = ""


class Candidate(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    output: str = Field(max_length=50000)


class BatchRunRequest(BaseModel):
    prompt_template: str = Field(min_length=1, max_length=20000)
    test_cases: list[TestCase] = Field(min_length=1, max_length=50)
    temperature: float = Field(default=0.2, ge=0, le=2)


class EvaluateRequest(BaseModel):
    task_description: str
    reference: str
    candidates: list[Candidate] = Field(min_length=1, max_length=50)


class Breakdown(BaseModel):
    correctness: int = Field(ge=0, le=40, strict=True)
    relevance: int = Field(ge=0, le=20, strict=True)
    concision: int = Field(ge=0, le=15, strict=True)
    clarity: int = Field(ge=0, le=15, strict=True)
    safety: int = Field(ge=0, le=10, strict=True)


class Score(BaseModel):
    candidate_id: str
    score: int = Field(ge=0, le=100, strict=True)
    breakdown: Breakdown
    reason: str


def fill_template(template: str, inputs: dict[str, str]) -> str:
    return re.sub(r"\{\{\s*(\w+)\s*\}\}", lambda m: inputs.get(m[1], m[0]), template)


@app.get("/")
async def index():
    return HTMLResponse(render("index.html"))


@app.post("/api/run")
async def run(req: RunRequest):
    prompt = fill_template(req.prompt_template, req.input_case)
    try:
        result = await run_prompt(prompt, req.temperature)
    except Exception:
        raise HTTPException(503, "Generation service unavailable") from None
    return JSONResponse(result)


@app.post("/api/batch-run")
async def batch_run(req: BatchRunRequest):
    results = []
    if len({tc.id for tc in req.test_cases}) != len(req.test_cases):
        raise HTTPException(422, "Test case IDs must be unique")
    for tc in req.test_cases:
        prompt = fill_template(req.prompt_template, tc.inputs)
        try:
            result = await run_prompt(prompt, req.temperature)
        except Exception:
            raise HTTPException(503, "Batch generation failed. Please retry.") from None
        results.append({
            "test_case_id": tc.id,
            "label": tc.label,
            "output": result["output"],
            "latency_ms": result["latency_ms"],
            "token_usage": result["token_usage"],
            "token_usage_estimated": result.get("token_usage_estimated", True),
        })

    return JSONResponse({"results": results})


@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    llm_scores = []

    try:
        raw = await evaluate_outputs(req.task_description, req.reference, [c.model_dump() for c in req.candidates])
        json_match = re.search(r"\[[\s\S]*\]|\{[\s\S]*\}", raw)
        if json_match:
            parsed = json.loads(json_match.group(0))
            for item in parsed if isinstance(parsed, list) else [parsed]:
                try:
                    score = Score.model_validate(item)
                    if score.score == sum(score.breakdown.model_dump().values()):
                        llm_scores.append(score.model_dump())
                except ValidationError:
                    continue
    except Exception:
        pass

    scores = []
    for c in req.candidates:
        found = next((s for s in llm_scores if s.get("candidate_id") == c.id), None)
        if found:
            scores.append(found)
        else:
            h = heuristic_score(req.reference, c.output)
            scores.append({
                "candidate_id": c.id,
                "score": h["total"],
                "breakdown": h["breakdown"],
                "reason": "Heuristic score (LLM evaluator unavailable)",
            })

    return JSONResponse({"scores": scores})
