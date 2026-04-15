from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from app.core.database import Base

class AnalyticsEvent(Base):
    """Granular events for detailed tracking."""
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_tg_id = Column(BigInteger, index=True, nullable=True) # Nullable for anonymous interactions if any
    event_type = Column(String(50), index=True, nullable=False) # e.g., 'app_open', 'story_started', 'story_completed'
    story_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    metadata_json = Column(Text, nullable=True) # Additional context stringified JSON
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class DailyMetric(Base):
    """Aggregated daily logic to prevent DB overload."""
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, unique=True, index=True, nullable=False) # Typically truncated to just the Day
    dau = Column(Integer, default=0) # Daily active users
    new_users = Column(Integer, default=0)
    total_stars_spent = Column(Integer, default=0)
    total_sessions = Column(Integer, default=0)
    avg_session_length_seconds = Column(Integer, default=0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
