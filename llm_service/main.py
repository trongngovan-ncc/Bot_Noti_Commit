import json
import requests
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from prompt import BASE_PROMPT

app = FastAPI()

class DiffRequest(BaseModel):
    diff: str

@app.post("/llm-review")
async def llm_review(req: DiffRequest):
    diff = req.diff
    if not diff:
        return {"error": "Missing diff"}

    try:
        prompt = f"""{BASE_PROMPT}

{diff}
"""

        with requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "phi3:3.8b", "prompt": prompt},
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
