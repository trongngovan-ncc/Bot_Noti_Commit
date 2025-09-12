# api/main.py
import os
import json
import requests
from fastapi import FastAPI, HTTPException
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
        raise HTTPException(status_code=400, detail="Missing diff")

    try:
        with requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": "mygpt:latest",
            "messages": [
                {
                    "role": "user",
                    "content": f"Dưới đây là Git diff, hãy review:\n\n```diff\n{diff}\n```"
                }
            ]
        },
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
                    review += data.get("message", {}).get("content", "")
                except Exception:
                    continue

        return {"review": review.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
