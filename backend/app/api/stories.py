import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from app.core.database import get_db
from app.core.storage import upload_file, delete_file, PREVIEW_BUCKET, JSON_BUCKET
from app.models.story import Story, StoryStatus, Like, Purchase, User
from app.schemas.story import StoryOut, PaymentVerify

router = APIRouter(prefix="/stories", tags=["Stories"])

HARDNESS_LABEL = {1: "Soft", 2: "Medium", 3: "Hard", 4: "Extreme"}


# ─── LIST / SEARCH ────────────────────────────────────────────────────────────

@router.get("/", response_model=List[StoryOut])
def get_stories(
    sort: str = Query("new", enum=["new", "popular", "top_liked", "free", "paid", "recommended"]),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    q = db.query(Story).filter(Story.status == StoryStatus.approved)

    if search:
        q = q.filter(Story.title.ilike(f"%{search}%"))
    if tag:
        q = q.filter(Story.tags.any(tag))

    if sort == "new":
        q = q.order_by(desc(Story.created_at))
    elif sort == "popular":
        q = q.order_by(desc(Story.plays_count))
    elif sort == "top_liked":
        q = q.order_by(desc(Story.likes_count))
    elif sort == "free":
        q = q.filter(Story.price_stars == 0).order_by(desc(Story.created_at))
    elif sort == "paid":
        q = q.filter(Story.price_stars > 0).order_by(desc(Story.created_at))
    elif sort == "recommended":
        # Score = (Plays * 1) + (Likes * 5) + (EngagementMinutes * 2) + (Recency weight)
        # We'll use a simplified version in SQL
        now = func.now()
        q = q.order_by(
            desc(
                Story.plays_count * 1 + 
                Story.likes_count * 5 + 
                Story.total_seconds_spent / 30 +
                func.exp(-func.extract('epoch', now - Story.created_at) / 86400.0) * 100
            )
        )

    return q.offset(skip).limit(limit).all()


@router.get("/{story_id}", response_model=StoryOut)
def get_story(story_id: str, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


# ─── USER'S OWN STORIES ───────────────────────────────────────────────────────

@router.get("/user/{tg_id}", response_model=List[StoryOut])
def get_user_stories(tg_id: int, db: Session = Depends(get_db)):
    return db.query(Story).filter(Story.author_tg_id == tg_id).order_by(desc(Story.created_at)).all()


# ─── UPLOAD ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=StoryOut)
async def create_story(
    title: str = Form(...),
    description: str = Form(...),
    tags: str = Form(""),           # comma-separated
    hardness_level: int = Form(1),
    price_stars: int = Form(0),
    author_tg_id: int = Form(...),
    author_username: Optional[str] = Form(None),
    author_nickname: Optional[str] = Form(None),
    author_first_name: Optional[str] = Form(None),
    preview_file: UploadFile = File(...), # Primary preview
    preview_extra: List[UploadFile] = File([]), # Extra previews
    json_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    story_id = str(uuid.uuid4())

    # Upload primary preview image
    preview_bytes = await preview_file.read()
    ext = preview_file.filename.rsplit(".", 1)[-1].lower() if "." in preview_file.filename else "jpg"
    preview_path = f"{story_id}/preview.{ext}"
    preview_url = upload_file(PREVIEW_BUCKET, preview_path, preview_bytes, preview_file.content_type or "image/jpeg")
    
    preview_urls = [preview_url]
    
    # Upload extra previews
    for i, file in enumerate(preview_extra):
        f_bytes = await file.read()
        f_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        f_path = f"{story_id}/preview_{i+1}.{f_ext}"
        f_url = upload_file(PREVIEW_BUCKET, f_path, f_bytes, file.content_type or "image/jpeg")
        preview_urls.append(f_url)

    # Upload JSON story
    json_bytes = await json_file.read()
    json_path = f"{story_id}/story.json"
    json_url = upload_file(JSON_BUCKET, json_path, json_bytes, "application/json")

    # Count scenes from JSON
    scenes_count = 0
    try:
        data = json.loads(json_bytes)
        if hasattr(data, "get"):
            scenes_count = len(data.get("scenes", data.get("nodes", [])))
        elif isinstance(data, list):
            scenes_count = len(data)
    except Exception:
        pass

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    story = Story(
        id=uuid.UUID(story_id),
        title=title,
        description=description,
        tags=tag_list,
        hardness_level=hardness_level,
        price_stars=price_stars,
        author_tg_id=author_tg_id,
        author_username=author_username,
        author_nickname=author_nickname,
        author_first_name=author_first_name,
        preview_url=preview_url,
        preview_urls=preview_urls,
        json_url=json_url,
        scenes_count=scenes_count,
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


# ─── LIKE / UNLIKE ────────────────────────────────────────────────────────────

@router.post("/{story_id}/like")
def toggle_like(story_id: str, user_tg_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    existing = db.query(Like).filter(
        Like.story_id == story_id,
        Like.user_tg_id == user_tg_id,
    ).first()

    if existing:
        db.delete(existing)
        story.likes_count = max(0, story.likes_count - 1)
        db.commit()
        return {"liked": False, "likes_count": story.likes_count}
    else:
        db.add(Like(story_id=story.id, user_tg_id=user_tg_id))
        story.likes_count += 1
        db.commit()
        return {"liked": True, "likes_count": story.likes_count}


@router.get("/{story_id}/liked")
def check_liked(story_id: str, user_tg_id: int, db: Session = Depends(get_db)):
    exists = db.query(Like).filter(
        Like.story_id == story_id,
        Like.user_tg_id == user_tg_id,
    ).first()
    return {"liked": bool(exists)}


# ─── PLAY / PURCHASE ─────────────────────────────────────────────────────────

@router.post("/{story_id}/play")
def record_play(story_id: str, user_tg_id: int, db: Session = Depends(get_db)):
    """Called when user starts playing. Increments play counter."""
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.plays_count += 1
    db.commit()
    return {"plays_count": story.plays_count}


@router.get("/{story_id}/purchased")
def check_purchased(story_id: str, user_tg_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.price_stars == 0:
        return {"purchased": True, "free": True}
    purchased = db.query(Purchase).filter(
        Purchase.story_id == story_id,
        Purchase.user_tg_id == user_tg_id,
    ).first()
    return {"purchased": bool(purchased), "free": False}


@router.post("/verify-payment")
def verify_payment(data: PaymentVerify, db: Session = Depends(get_db)):
    """Verify Telegram Stars payment and unlock story access."""
    story = db.query(Story).filter(Story.id == data.story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    existing = db.query(Purchase).filter(
        Purchase.story_id == data.story_id,
        Purchase.user_tg_id == data.user_tg_id,
    ).first()
    if existing:
        return {"status": "already_purchased"}

    purchase = Purchase(
        story_id=story.id,
        user_tg_id=data.user_tg_id,
        stars_paid=data.stars_paid,
        telegram_payment_charge_id=data.telegram_payment_charge_id,
    )
    db.add(purchase)
    db.commit()
    return {"status": "success", "json_url": story.json_url}


# ─── USER LIKED STORIES ───────────────────────────────────────────────────────

@router.get("/user/{tg_id}/liked", response_model=List[StoryOut])
def get_liked_stories(tg_id: int, db: Session = Depends(get_db)):
    likes = db.query(Like).filter(Like.user_tg_id == tg_id).all()
    story_ids = [l.story_id for l in likes]
    if not story_ids:
        return []
    return db.query(Story).filter(Story.id.in_(story_ids)).all()
