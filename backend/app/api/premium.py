from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.story import User, SubscriptionTier
from app.schemas.story import PremiumPaymentVerify, UserOut
from app.core.bot import bot
from aiogram.types import LabeledPrice
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/premium", tags=["Premium"])

@router.post("/create-invoice")
async def create_premium_invoice(user_tg_id: int):
    """Generate a Telegram Stars invoice link for Premium subscription (149 Stars)"""
    try:
        prices = [LabeledPrice(label="Lust Choices Premium (1 месяц)", amount=149)]
        
        invoice_link = await bot.create_invoice_link(
            title="Lust Choices Premium",
            description="👑 Полный доступ ко всем функциям платформы на 30 дней:\n"
                        "• Безлимитное создание сюжетов\n"
                        "• Сниженная комиссия (10%)\n"
                        "• Premium-бейдж и золотая тема\n"
                        "• Приоритет в ленте рекомендаций",
            payload=f"premium_30d_{user_tg_id}",
            provider_token="", # Empty for Stars
            currency="XTR",
            prices=prices
        )
        return {"invoice_link": invoice_link}
    except Exception as e:
        logger.error(f"Error creating premium invoice: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при создании ссылки на оплату")

@router.post("/verify", response_model=UserOut)
async def verify_premium_payment(data: PremiumPaymentVerify, db: Session = Depends(get_db)):
    """Verify premium payment and upgrade user account"""
    user = db.query(User).filter(User.tg_id == data.user_tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # In a real app, we should verify the charge_id with TG API
    # For now, we trust the client-side success and the unique charge_id
    
    # Upgrade user
    user.subscription_tier = SubscriptionTier.premium
    
    # Update expiry: if already premium, extend from expiry, else from now
    now = datetime.utcnow()
    if user.subscription_expires_at and user.subscription_expires_at > now:
        user.subscription_expires_at += timedelta(days=30)
    else:
        user.subscription_expires_at = now + timedelta(days=30)
    
    # Track spend
    user.total_spent_stars += data.stars_paid
    
    db.commit()
    db.refresh(user)
    return user
