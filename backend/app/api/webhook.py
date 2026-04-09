from fastapi import APIRouter, Request
from aiogram.types import Update
from app.core.bot import bot, dp
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["Webhook"])

@router.post("/telegram")
async def telegram_webhook(request: Request):
    """Receive updates from Telegram"""
    try:
        data = await request.json()
        update = Update(**data)
        await dp.feed_update(bot=bot, update=update)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"ok": True}
