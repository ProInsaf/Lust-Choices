from fastapi import APIRouter, Depends, HTTPException, Header, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
import urllib.parse
import logging

from app.core.database import get_db
from app.models.story import Story, StoryStatus, User, Purchase, Like
from app.models.analytics import DailyMetric, AnalyticsEvent
from app.schemas.story import StoryOut, AdminAction, UserOut
from app.core.storage import delete_file, PREVIEW_BUCKET, JSON_BUCKET
from app.core.bot import bot

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_SECRET = "insafbober"  # also checked via username header


def require_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Admin access required")


# ─── PENDING QUEUE ────────────────────────────────────────────────────────────

@router.get("/stories/pending", response_model=List[StoryOut], dependencies=[Depends(require_admin)])
def get_pending(db: Session = Depends(get_db)):
    return db.query(Story).filter(
        Story.status == StoryStatus.pending
    ).order_by(Story.created_at).all()


@router.get("/stories/all", response_model=List[StoryOut], dependencies=[Depends(require_admin)])
def get_all_stories(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Story)
    if status:
        q = q.filter(Story.status == status)
    return q.order_by(desc(Story.created_at)).offset(skip).limit(limit).all()


# ─── APPROVE ─────────────────────────────────────────────────────────────────

@router.post("/stories/{story_id}/approve", dependencies=[Depends(require_admin)])
async def approve_story(story_id: str, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.status = StoryStatus.approved
    story.reject_reason = None
    db.commit()
    
    # Notify user
    try:
        await bot.send_message(
            story.author_tg_id,
            f"🎉 <b>Ваш сюжет одобрен!</b>\n\nСюжет «{story.title}» теперь доступен всем пользователям. Желаем много прохождений! 🔥",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Failed to notify user {story.author_tg_id}: {e}")
        
    return {"status": "approved", "story_id": story_id}


# ─── REJECT ──────────────────────────────────────────────────────────────────

@router.post("/stories/{story_id}/reject", dependencies=[Depends(require_admin)])
async def reject_story(story_id: str, body: AdminAction, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    reason = body.reason or "Не соответствует правилам платформы"
    
    # Notify user
    try:
        await bot.send_message(
            story.author_tg_id,
            f"❌ <b>Ваш сюжет отклонен</b>\n\nСюжет: «{story.title}»\nПричина: {reason}\n\nВы можете исправить ошибки и загрузить его снова. 🙏",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Failed to notify user {story.author_tg_id}: {e}")

    story.status = StoryStatus.rejected
    story.reject_reason = reason
    
    # Сразу удаляем файлы из облака при отказе
    try:
        if story.preview_url and "/public/previews/" in story.preview_url:
            p_path = urllib.parse.unquote(story.preview_url.split("/public/previews/")[-1])
            delete_file(PREVIEW_BUCKET, p_path)
        if story.json_url and "/public/stories/" in story.json_url:
            j_path = urllib.parse.unquote(story.json_url.split("/public/stories/")[-1])
            delete_file(JSON_BUCKET, j_path)
    except Exception as e:
        logger.error(f"Failed to delete files for rejected story {story_id}: {e}")

    db.commit()
    return {"status": "rejected", "story_id": story_id, "reason": story.reject_reason}


# ─── DELETE ──────────────────────────────────────────────────────────────────

@router.delete("/stories/{story_id}", dependencies=[Depends(require_admin)])
def delete_story(story_id: str, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    try:
        if story.preview_url and "/public/previews/" in story.preview_url:
            p_path = urllib.parse.unquote(story.preview_url.split("/public/previews/")[-1])
            delete_file(PREVIEW_BUCKET, p_path)
        if story.preview_urls:
            for url in story.preview_urls:
                if "/public/previews/" in url:
                    p_path = urllib.parse.unquote(url.split("/public/previews/")[-1])
                    delete_file(PREVIEW_BUCKET, p_path)
        if story.json_url and "/public/stories/" in story.json_url:
            j_path = urllib.parse.unquote(story.json_url.split("/public/stories/")[-1])
            delete_file(JSON_BUCKET, j_path)
    except Exception as e:
        logger.error(f"Failed to delete files for deleted story {story_id}: {e}")

    db.delete(story)
    db.commit()
    return {"status": "deleted"}


# ─── STATS ───────────────────────────────────────────────────────────────────

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_stats(db: Session = Depends(get_db)):
    total_stories = db.query(Story).count()
    pending = db.query(Story).filter(Story.status == StoryStatus.pending).count()
    approved = db.query(Story).filter(Story.status == StoryStatus.approved).count()
    rejected = db.query(Story).filter(Story.status == StoryStatus.rejected).count()
    
    total_users = db.query(User).count()
    
    now = datetime.utcnow()
    active_24h = db.query(User).filter(User.last_active >= now - timedelta(days=1)).count()
    active_7d = db.query(User).filter(User.last_active >= now - timedelta(days=7)).count()
    new_users_24h = db.query(User).filter(User.created_at >= now - timedelta(days=1)).count()
    
    total_stars_spent = db.query(func.sum(Purchase.stars_paid)).scalar() or 0
    total_stars_in_balances = db.query(func.sum(User.stars_balance)).scalar() or 0
    
    total_plays = db.query(func.sum(Story.plays_count)).scalar() or 0
    total_likes = db.query(func.sum(Story.likes_count)).scalar() or 0
    
    # Engagement stats
    total_seconds = db.query(func.sum(User.total_seconds_spent)).scalar() or 0
    avg_seconds_per_user = total_seconds / total_users if total_users > 0 else 0
    
    # New metrics
    unique_buyers = db.query(func.count(func.distinct(Purchase.user_tg_id))).scalar() or 0
    conversion_rate = (unique_buyers / total_users * 100) if total_users > 0 else 0
    avg_purchase_value = (total_stars_spent / unique_buyers) if unique_buyers > 0 else 0
    
    seven_days_ago = now - timedelta(days=6)
    stories_last_7d = db.query(Story).filter(Story.created_at >= seven_days_ago).count()
    
    # Leaderboards
    top_stories = db.query(Story).order_by(desc(Story.plays_count)).limit(10).all()
    top_stories_data = [{
        "id": str(s.id),
        "title": s.title,
        "plays": s.plays_count,
        "seconds": s.total_seconds_spent,
        "author": s.author_username or s.author_first_name or "anon"
    } for s in top_stories]
    
    top_authors = db.query(
        Story.author_tg_id, 
        func.max(Story.author_username).label("username"),
        func.max(Story.author_first_name).label("first_name"),
        func.sum(Story.plays_count).label("total_plays"),
        func.sum(Story.total_seconds_spent).label("total_seconds")
    ).group_by(Story.author_tg_id).order_by(desc("total_plays")).limit(10).all()
    
    top_authors_data = [{
        "tg_id": a.author_tg_id,
        "name": a.username or a.first_name or "anon",
        "plays": a.total_plays,
        "seconds": a.total_seconds
    } for a in top_authors]
    
    recent_users = db.query(User.created_at).filter(User.created_at >= seven_days_ago).all()
    user_counts_by_date = {}
    for (created_at,) in recent_users:
        if created_at:
            d = created_at.strftime('%Y-%m-%d')
            user_counts_by_date[d] = user_counts_by_date.get(d, 0) + 1
            
    recent_purchases = db.query(Purchase.created_at, Purchase.stars_paid).filter(Purchase.created_at >= seven_days_ago).all()
    purchases_by_date = {}
    for created_at, amount in recent_purchases:
        if created_at:
            d = created_at.strftime('%Y-%m-%d')
            purchases_by_date[d] = purchases_by_date.get(d, 0) + amount

    # DAU chart data (fallback)
    dau_recent = db.query(User.last_active).filter(User.last_active >= seven_days_ago).all()
    dau_by_date = {}
    for (last_active,) in dau_recent:
        if last_active:
            d = last_active.strftime('%Y-%m-%d')
            dau_by_date[d] = dau_by_date.get(d, 0) + 1

    # Admin Chart data using DailyMetric model for better performance & accuracy
    daily_metrics = db.query(DailyMetric).filter(DailyMetric.date >= seven_days_ago).order_by(DailyMetric.date).all()
    
    chart_data = []
    
    # Pad missing days if any
    for i in range(7):
        d = (now.date() - timedelta(days=6 - i))
        stat = next((m for m in daily_metrics if m.date.date() == d), None)
        
        # Fallback to legacy tracking if new Analytics Event metric is missing
        str_d = d.strftime('%Y-%m-%d')
        chart_data.append({
            "date": str_d,
            "new_users": stat.new_users if stat else user_counts_by_date.get(str_d, 0),
            "stars_spent": stat.total_stars_spent if stat else purchases_by_date.get(str_d, 0),
            "active_users": stat.dau if stat and stat.dau > 0 else dau_by_date.get(str_d, 0)
        })

    return {
        "summary": {
            "stories_total": total_stories,
            "stories_pending": pending,
            "stories_approved": approved,
            "stories_rejected": rejected,
            "stories_last_7d": stories_last_7d,
            "users_total": total_users,
            "users_active_24h": active_24h,
            "users_active_7d": active_7d,
            "users_new_24h": new_users_24h,
            "stars_spent_total": total_stars_spent,
            "stars_in_balances": total_stars_in_balances,
            "plays_total": total_plays,
            "likes_total": total_likes,
            "engagement_total_hours": round(total_seconds / 3600, 1),
            "engagement_avg_minutes": round(avg_seconds_per_user / 60, 1),
            "conversion_rate": round(conversion_rate, 2),
            "avg_purchase_value": round(avg_purchase_value, 1),
            "unique_buyers": unique_buyers
        },
        "top_stories": top_stories_data,
        "top_authors": top_authors_data,
        "chart_data": chart_data
    }


@router.get("/stories/{story_id}/performance", dependencies=[Depends(require_admin)])
def get_story_performance(story_id: str, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    starts = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.story_id == story_id, 
        AnalyticsEvent.event_type == "story_started"
    ).count()
    
    completes = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.story_id == story_id, 
        AnalyticsEvent.event_type == "story_completed"
    ).count()
    
    completion_rate = (completes / starts * 100) if starts > 0 else 0
    story.completion_rate = completion_rate # Update cached value
    db.commit()
    
    return {
        "story_id": story_id,
        "title": story.title,
        "starts": starts,
        "completes": completes,
        "completion_rate": completion_rate,
        "plays_count": story.plays_count,
        "likes_count": story.likes_count,
        "total_seconds_spent": story.total_seconds_spent
    }


# ─── USERS MANAGEMENT ────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut], dependencies=[Depends(require_admin)])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(User)
    if search:
        search_filter = (User.username.ilike(f"%{search}%")) | \
                        (User.first_name.ilike(f"%{search}%")) | \
                        (User.nickname.ilike(f"%{search}%"))
        if search.isdigit():
            search_filter |= (User.tg_id == int(search))
        q = q.filter(search_filter)
        
    return q.order_by(desc(User.created_at)).offset(skip).limit(limit).all()


@router.post("/users/{user_id}/balance", dependencies=[Depends(require_admin)])
def add_user_balance(user_id: int, add_stars: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.stars_balance += add_stars
    db.commit()
    return {"status": "success", "new_balance": user.stars_balance}


@router.post("/users/{user_id}/ban", dependencies=[Depends(require_admin)])
def toggle_user_ban(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = not user.is_banned
    db.commit()
    return {"status": "success", "is_banned": user.is_banned}


@router.post("/broadcast", dependencies=[Depends(require_admin)])
async def broadcast_message(
    message: str = Form(...),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Send message to all users or a specific user via bot."""
    if user_id:
        targets = [user_id]
    else:
        # Get all users who are not banned
        targets = [u.tg_id for u in db.query(User.tg_id).filter(User.is_banned == False).all()]
    
    count = 0
    for tid in targets:
        try:
            await bot.send_message(tid, message, parse_mode="HTML")
            count += 1
            if not user_id:
                await asyncio.sleep(0.05) # Rate limiting
        except Exception as e:
            logger.error(f"Failed to send broadcast to {tid}: {e}")
            
    return {"sent_count": count, "total_targets": len(targets)}
