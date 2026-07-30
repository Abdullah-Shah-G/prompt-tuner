import re
import json
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel

from chain import run_prompt, evaluate_outputs, heuristic_score

app = FastAPI(title="Prompt Tuner")
TEMPLATES_DIR = Path("templates")


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class RunRequest(BaseModel):
    prompt_template: str
    input_case: dict[str, str]
    temperature: float = 0.2


class BatchRunRequest(BaseModel):
    prompt_template: str
    test_cases: list[dict]
    temperature: float = 0.2


class EvaluateRequest(BaseModel):
    task_description: str
    reference: str
    candidates: list[dict]


@app.get("/")
async def index():
    return HTMLResponse(render("index.html"))


@app.post("/api/run")
async def run(req: RunRequest):
    prompt = req.prompt_template
    for key, value in req.input_case.items():
        prompt = prompt.replace(f"{{{{ {key} }}}}", value).replace(
            f"{{{{{key}}}}}", value
        )

    result = await run_prompt(prompt, req.temperature)
    return JSONResponse(result)


@app.post("/api/batch-run")
async def batch_run(req: BatchRunRequest):
    results = []
    for tc in req.test_cases:
        prompt = req.prompt_template
        for key, value in tc.get("inputs", {}).items():
            prompt = prompt.replace(f"{{{{ {key} }}}}", value).replace(
                f"{{{{{key}}}}}", value
            )

        result = await run_prompt(prompt, req.temperature)
        results.append({
            "test_case_id": tc["id"],
            "label": tc.get("label", ""),
            "output": result["output"],
            "latency_ms": result["latency_ms"],
            "token_usage": result["token_usage"],
        })

    return JSONResponse({"results": results})


@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    llm_scores = []

    try:
        raw = await evaluate_outputs(req.task_description, req.reference, req.candidates)
        json_match = re.search(r"\[[\s\S]*\]|\{[\s\S]*\}", raw)
        if json_match:
            parsed = json.loads(json_match.group(0))
            llm_scores = parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        pass

    scores = []
    for c in req.candidates:
        found = next((s for s in llm_scores if s.get("candidate_id") == c["id"]), None)
        if found:
            scores.append(found)
        else:
            h = heuristic_score(req.reference, c["output"])
            scores.append({
                "candidate_id": c["id"],
                "score": h["total"],
                "breakdown": h["breakdown"],
                "reason": "Heuristic score (LLM evaluator unavailable)",
            })

    return JSONResponse({"scores": scores})
