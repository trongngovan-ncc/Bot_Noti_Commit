# llm_service/key_schedule.py
import threading
import time
import requests
import logging
from dotenv import load_dotenv
import os

load_dotenv()
PUBLIC_KEY_URL = os.getenv("PUBLIC_KEY_URL")
CACHE = {"public_key": None}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def fetch_public_key():
    try:
        response = requests.get(PUBLIC_KEY_URL, timeout=5)
        response.raise_for_status()
        CACHE["public_key"] = response.text.strip()
        logging.info("Public key đã được cập nhật từ URL")
    except Exception as e:
        logging.warning(f"Không thể lấy public key từ URL: {e}. Thử lấy từ biến môi trường.")
        env_public_key = os.getenv("PUBLIC_KEY")
        if env_public_key:
            CACHE["public_key"] = env_public_key.replace("\\n", "\n")
            logging.info("Public key đã được lấy từ biến môi trường")
        else:
            logging.error("Không tìm thấy public key trong biến môi trường")

def schedule_key_update(interval_seconds=86400):
    def job():
        time.sleep(interval_seconds)
        while True:
            fetch_public_key()
            time.sleep(interval_seconds)

    thread = threading.Thread(target=job, daemon=True)
    thread.start()
