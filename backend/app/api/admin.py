from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.core.database import get_db
from app.core.telegram import is_admin
from app.models.story import Story, StoryStatus, User
from app.schemas.story import StoryOut, AdminAction, UserOut
from app.core.storage import delete_file, PREVIEW_BUCKET, JSON_BUCKET
import urllib.parse
import logging

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
def approve_story(story_id: str, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.status = StoryStatus.approved
    story.reject_reason = None
    db.commit()
    return {"status": "approved", "story_id": story_id}


# ─── REJECT ──────────────────────────────────────────────────────────────────

@router.post("/stories/{story_id}/reject", dependencies=[Depends(require_admin)])
def reject_story(story_id: str, body: AdminAction, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.status = StoryStatus.rejected
    story.reject_reason = body.reason or "Не соответствует правилам платформы"
    
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
    total = db.query(Story).count()
    pending = db.query(Story).filter(Story.status == StoryStatus.pending).count()
    approved = db.query(Story).filter(Story.status == StoryStatus.approved).count()
    rejected = db.query(Story).filter(Story.status == StoryStatus.rejected).count()
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }


# ─── USERS MANAGEMENT ────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut], dependencies=[Depends(require_admin)])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(User).order_by(desc(User.created_at)).offset(skip).limit(limit).all()


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
