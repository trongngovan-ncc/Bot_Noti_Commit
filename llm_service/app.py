# llm_service/app.py
import os
import json
import requests
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uvicorn
from dotenv import load_dotenv
import time 
from prompt import UPDATE_PROMPT
from verify import verify_token 
from key_schedule import schedule_key_update, fetch_public_key, CACHE
from contextlib import asynccontextmanager
import logging
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    fetch_public_key()
    if not CACHE.get('public_key'):
        logging.error("Không tải được public key khi khởi động")
        raise RuntimeError("Không tải được public key khi khởi động")
    schedule_key_update(interval_seconds=86400)
    yield

app = FastAPI(lifespan=lifespan)
class DiffRequest(BaseModel):
    prompt: Optional[str] = None
    diff: str

@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health_check():
    return {"ok": True}

@app.post("/llm-review")
async def llm_review(req: DiffRequest,
                     payload: dict = Depends(verify_token)):
    prompt = req.prompt if req.prompt else UPDATE_PROMPT
    diff = req.diff
    if not diff:
        raise HTTPException(status_code=400, detail="Missing diff")

    try:
#         prompt = f"""{UPDATE_PROMPT}
# Diff: 
# {diff}
# """

        start_time = time.time()
        with requests.post(
            os.getenv("OLLAMA_URL"),
            json={"model": "gemma3:4b-it-qat", "prompt": prompt},
            stream=True,
            timeout=600
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
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
