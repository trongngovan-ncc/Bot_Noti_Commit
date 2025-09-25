# llm_service/verify.py
from fastapi import HTTPException, Header
import jwt
import logging
from key_schedule import CACHE

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu hoặc sai định dạng Authorization header")

    token = authorization.split(" ")[1]
    public_key = CACHE.get("public_key")

    if not public_key:
        logging.error("Public key chưa được tải")
        raise HTTPException(status_code=500, detail="Public key chưa được tải")

    try:
        payload = jwt.decode(
            token,
            public_key.encode("utf-8"),
            algorithms=["RS256"]
        )
        logging.info(f"Token hợp lệ: {payload}")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except jwt.InvalidTokenError as e:
        logging.error(f"Token không hợp lệ: {str(e)}")
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
