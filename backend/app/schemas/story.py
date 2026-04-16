from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.story import StoryStatus


class StoryBase(BaseModel):
    title: str
    description: str
    tags: List[str] = []
    hardness_level: int = 1
    price_stars: int = 0


class StoryCreate(StoryBase):
    preview_url: str
    json_url: str
    author_tg_id: int
    author_username: Optional[str] = None
    author_first_name: Optional[str] = None
    scenes_count: int = 0


class StoryOut(StoryBase):
    id: UUID
    author_tg_id: int
    author_username: Optional[str] = None
    author_nickname: Optional[str] = None
    author_first_name: Optional[str] = None
    author_is_premium: bool = False

    preview_url: str
    preview_urls: Optional[List[str]] = []
    json_url: str
    status: StoryStatus
    reject_reason: Optional[str] = None
    likes_count: int
    scenes_count: int
    plays_count: int = 0
    total_seconds_spent: int = 0
    
    # New detailed fields
    long_description: Optional[str] = None
    characters_info: Optional[dict] = None
    completion_rate: float = 0.0
    
    created_at: datetime

    class Config:
        from_attributes = True


class StoryFilter(BaseModel):
    sort: Optional[str] = "new"   # new | popular | top_liked | free | paid
    search: Optional[str] = None
    tag: Optional[str] = None


class UserOut(BaseModel):
    tg_id: int
    username: Optional[str] = None
    nickname: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    is_admin: bool = False
    is_banned: bool = False
    stars_balance: int = 0
    total_spent_stars: int = 0
    total_earned_stars: int = 0
    total_seconds_spent: int = 0
    
    # Customization
    profile_theme: str = "default"
    last_nickname_updated_at: Optional[datetime] = None

    
    subscription_tier: str = "basic"
    subscription_expires_at: Optional[datetime] = None
    stories_created_this_month: int = 0
    last_limit_reset_at: Optional[datetime] = None
    created_at: datetime

    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpsert(BaseModel):
    tg_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None


class NicknameUpdate(BaseModel):
    nickname: str


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_theme: Optional[str] = None
    subscription_tier: Optional[str] = None





class AdminAction(BaseModel):
    reason: Optional[str] = None


class ActivitySync(BaseModel):
    user_tg_id: int
    story_id: Optional[str] = None
    seconds: int


class PaymentVerify(BaseModel):
    story_id: str
    user_tg_id: int
    telegram_payment_charge_id: str
    stars_paid: int


class PremiumPaymentVerify(BaseModel):
    user_tg_id: int
    telegram_payment_charge_id: str
    stars_paid: int

