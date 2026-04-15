import uuid
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.analytics import AnalyticsEvent, DailyMetric
from app.schemas.analytics import EventCreate

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def aggregate_and_prune_data(db: Session):
    """Background task to aggregate raw events and delete older data."""
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # 1. Prune old data (older than 30 days) to prevent DB bloat
    cutoff = datetime.utcnow() - timedelta(days=30)
    db.query(AnalyticsEvent).filter(AnalyticsEvent.created_at < cutoff).delete()
    
    # 2. Daily Metric Aggregation (simplified for today)
    metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
    if not metric:
        metric = DailyMetric(date=today)
        db.add(metric)
        db.commit()
    
    # Calculate DAU
    dau = db.query(AnalyticsEvent.user_tg_id)\
            .filter(AnalyticsEvent.event_type == "app_open")\
            .filter(func.date(AnalyticsEvent.created_at) == today)\
            .distinct().count()
    
    # In a real heavy-load scenario we wouldn't update on every event, 
    # but for simple high-quality stats we can update periodically.
    metric.dau = dau
    db.commit()

@router.post("/event")
def log_event(event: EventCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Log user interactions: app opens, story starts."""
    new_event = AnalyticsEvent(
        user_tg_id=event.user_tg_id,
        event_type=event.event_type,
        metadata_json=event.metadata_json
    )
    if event.story_id:
        new_event.story_id = uuid.UUID(event.story_id)
        
    db.add(new_event)
    db.commit()
    
    # Occasionally trigger the background aggregation (1 in 10 chance or so)
    # Just to keep the DailyMetric updated without a true cron server
    import random
    if random.random() < 0.1:
        background_tasks.add_task(aggregate_and_prune_data, db)
        
    return {"status": "success"}
