import os
import hmac
import hashlib
import json
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_TG_USERNAME = os.getenv("ADMIN_USERNAME", "insafbober").lstrip("@")


def verify_telegram_init_data(init_data: str) -> dict | None:
    """
    Verifies the Telegram WebApp initData hash.
    Returns parsed user dict on success or None on failure.
    """
    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None

        sorted_items = sorted(parsed.items())
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted_items)

        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        user_json = parsed.get("user", "{}")
        return json.loads(user_json)
    except Exception:
        return None


def is_admin(username: str | None) -> bool:
    if not username:
        return False
    return username.lstrip("@").lower() == ADMIN_TG_USERNAME.lower()
