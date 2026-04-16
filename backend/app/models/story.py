from sqlalchemy import Column, String, Integer, BigInteger, Enum, DateTime, ForeignKey, Boolean, Text, Float
import enum
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from app.core.database import Base

# Platform commission rates
PLATFORM_COMMISSION_BASIC = 0.15    # 15% for Basic users
PLATFORM_COMMISSION_PREMIUM = 0.10  # 10% for Premium users


class StoryStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Story(Base):
    __tablename__ = "stories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=False)
    long_description = Column(Text, nullable=True)
    characters_info = Column(JSONB, nullable=True)
    completion_rate = Column(Float, default=0.0)
    author_tg_id = Column(BigInteger, index=True, nullable=False)
    author_username = Column(String(100), nullable=True)
    author_nickname = Column(String(100), nullable=True)
    author_first_name = Column(String(100), nullable=True)

    preview_url = Column(String(500), nullable=False)  # Keep for compatibility
    preview_urls = Column(ARRAY(String), default=[]) # Multiple previews
    json_url = Column(String(500), nullable=False)

    tags = Column(ARRAY(String), default=[])
    hardness_level = Column(Integer, default=1)  # 1=Soft, 2=Medium, 3=Hard, 4=Extreme
    price_stars = Column(Integer, default=0)

    status = Column(Enum(StoryStatus), default=StoryStatus.pending, index=True)
    reject_reason = Column(Text, nullable=True)

    likes_count = Column(Integer, default=0)
    scenes_count = Column(Integer, default=0)
    plays_count = Column(Integer, default=0)
    total_seconds_spent = Column(BigInteger, default=0) # Engagement metric

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_tg_id = Column(BigInteger, index=True, nullable=False)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_tg_id = Column(BigInteger, index=True, nullable=False)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    stars_paid = Column(Integer, nullable=False)
    telegram_payment_charge_id = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SubscriptionTier(str, enum.Enum):
    basic = "basic"
    premium = "premium"


class User(Base):
    __tablename__ = "users"

    tg_id = Column(BigInteger, primary_key=True)
    username = Column(String(100), nullable=True)
    nickname = Column(String(50), nullable=True, unique=True) # Public nickname
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    stars_balance = Column(Integer, default=0)
    total_spent_stars = Column(Integer, default=0)
    total_earned_stars = Column(Integer, default=0)  # Stars earned from story sales
    total_seconds_spent = Column(BigInteger, default=0) # Engagement metric
    
    # Customization & Settings
    bio = Column(Text, nullable=True)
    accent_color = Column(String(20), default="#DC2650") # Default primary color
    
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.basic)
    subscription_expires_at = Column(DateTime, nullable=True)
    stories_created_this_month = Column(Integer, default=0)
    last_limit_reset_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    last_active = Column(DateTime, default=datetime.utcnow)
