# llm_service/app.py
import os
import json
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from prompt import BASE_PROMPT_CHAIN_OF_THOUGHT, SHORTER_PROMPT
from dotenv import load_dotenv
import time  
import logging
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


app = FastAPI()

class DiffRequest(BaseModel):
    diff: str


@app.post("/llm-review")
async def llm_review(req: DiffRequest):
    diff = req.diff
    if not diff:
        raise HTTPException(status_code=400, detail="Missing diff")

    try:
        prompt = f"""{SHORTER_PROMPT}
Diff: 
{diff}
"""

        start_time = time.time()
        with requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "gemma3:12b-it-qat", "prompt": prompt},
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
        end_time = time.time()
        response_time = end_time - start_time
        logging.info(f"Thời gian phản hồi của mô hình: {response_time:.2f}s")


        return {"review": review.strip()}

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
