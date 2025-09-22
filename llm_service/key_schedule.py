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
        logging.info("Public key đã được cập nhật")
    except Exception as e:
        logging.error(f"Update public key thất bại: {e}")


def schedule_key_update(interval_seconds=86400):
    def job():
        time.sleep(interval_seconds)
        while True:
            fetch_public_key()
            time.sleep(interval_seconds)

    thread = threading.Thread(target=job, daemon=True)
    thread.start()
