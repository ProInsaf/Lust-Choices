from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime
from datetime import datetime

from app.core.database import Base

class UserTagScore(Base):
    """Tracks how much a user interacts with specific tags for the recommendation engine."""
    __tablename__ = "user_tag_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_tg_id = Column(BigInteger, index=True, nullable=False)
    tag = Column(String(100), index=True, nullable=False)
    score = Column(Float, default=0.0) # Increases based on completed stories, liked stories with this tag
    last_interacted = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Could add UniqueConstraint('user_tg_id', 'tag') if needed
