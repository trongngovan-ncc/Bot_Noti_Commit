# api/main.py
import os
import json
import requests
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from prompt import BASE_PROMPT_CHAIN_OF_THOUGHT
from dotenv import load_dotenv
load_dotenv()

from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

class DiffRequest(BaseModel):
    diff: str

@app.post("/llm-review")
async def llm_review(req: DiffRequest):
    diff = req.diff
    if not diff:
        return {"error": "Missing diff"}

    prompt = f"""{BASE_PROMPT_CHAIN_OF_THOUGHT}
                {diff}
"""

    try:
        model_id = os.getenv("GEMINI_MODEL")

        response = client.models.generate_content(
            model=model_id,
            contents=prompt
        )

        review_text = response.text if hasattr(response, "text") else str(response)

        if not review_text or review_text.strip() == "":
            review_text = "No review returned (empty)."

        return {"review": review_text.strip()}

    except Exception as e:
        return {"error": str(e)}



@app.post("/llm-review-ollama")
async def llm_review(req: DiffRequest):
    diff = req.diff
    if not diff:
        return {"error": "Missing diff"}

    try:
        prompt = f"""{BASE_PROMPT_CHAIN_OF_THOUGHT}
Diff: 
{diff}
"""

        with requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "qwen2.5:7b", "prompt": prompt},
            stream=True,
            timeout=300
        ) as resp:
            if resp.status_code != 200:
                return {"error": f"Ollama error: {resp.text}", "status_code": resp.status_code}

            review = ""
            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line.decode("utf-8"))
                    review += data.get("response", "")
                except Exception:
                    continue

        return {"review": review.strip()}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
