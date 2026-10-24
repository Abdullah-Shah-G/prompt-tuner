import os
import re
import json
import time
from functools import cache
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

@cache
def get_llm():
    return ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", api_key=os.getenv("GEMINI_API_KEY"), max_output_tokens=500, temperature=0.2)

EVALUATOR_SYSTEM_PROMPT = """You are PromptEvaluator. Given: (1) a task description, (2) a reference expected output, and (3) candidate outputs, score each candidate on the following rubric out of 100: correctness (40), relevance (20), concision (15), clarity (15), safety (10). Provide a JSON summary: {candidate_id, score, breakdown:{correctness, relevance, concision, clarity, safety}, reason}. Do not produce anything else.

Examples:

Task: "Convert product descriptions to 2-line marketing blurbs."
Reference: "A small portable blender — perfect for smoothies on the go."
Candidate 1: "A lightweight blender for making smoothies anywhere, anytime."
Output: {"candidate_id":"1","score":90,"breakdown":{"correctness":35,"relevance":20,"concision":12,"clarity":13,"safety":10},"reason":"Captures the core idea concisely, matches reference tone, slightly verbose."}

Task: "Summarize the following email in one sentence."
Reference: "Meeting rescheduled to Friday at 2pm."
Candidate 1: "The meeting has been moved to Friday at 2 PM."
Output: {"candidate_id":"1","score":95,"breakdown":{"correctness":38,"relevance":20,"concision":14,"clarity":14,"safety":9},"reason":"Accurate, concise, matches reference well."}"""


async def run_prompt(prompt: str, temperature: float = 0.2) -> dict:
    start = time.perf_counter()
    result = await get_llm().bind(temperature=temperature).ainvoke([{"role": "user", "content": prompt}])
    content = result.content
    if isinstance(content, list):
        content = "".join(c.get("text", "") for c in content)
    latency = int((time.perf_counter() - start) * 1000)
    output = content.strip() or ""
    usage = result.usage_metadata or {}
    return {"output": output, "latency_ms": latency, "token_usage": usage.get("total_tokens", max(1, len(output) // 4)), "token_usage_estimated": "total_tokens" not in usage}


async def evaluate_outputs(
    task_description: str,
    reference: str,
    candidates: list[dict],
) -> str:
    candidates_block = "\n".join(
        f'Candidate {c["id"]}: "{c["output"]}"' for c in candidates
    )
    user_prompt = f'Task: "{task_description}"\nReference: "{reference}"\n{candidates_block}'

    eval_llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        api_key=os.getenv("GEMINI_API_KEY"),
        max_output_tokens=1000,
        temperature=0,
    )

    messages = [
        {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    result = await eval_llm.ainvoke(messages)
    content = result.content
    if isinstance(content, list):
        content = "".join(c.get("text", "") for c in content)
    return content.strip() or ""


def heuristic_score(reference: str, output: str) -> dict:
    if not output.strip():
        return {"total": 0, "breakdown": dict.fromkeys(("correctness", "relevance", "concision", "clarity", "safety"), 0)}
    ref_words = set(reference.lower().split())
    out_words = set(output.lower().split())
    overlap = len(ref_words & out_words)
    total = len(ref_words | out_words)
    correctness = round(40 * (overlap / max(total, 1)))
    relevance = 15 if overlap > 2 else 10
    concision = 15 if len(output.split()) <= len(reference.split()) * 1.5 else 8
    clarity = 12 if len(output) > 20 else 10
    safety = 10

    total_score = correctness + relevance + concision + clarity + safety
    return {
        "total": total_score,
        "breakdown": {
            "correctness": correctness,
            "relevance": relevance,
            "concision": concision,
            "clarity": clarity,
            "safety": safety,
        },
    }
