from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.story import User, Story
from app.schemas.story import UserOut, UserUpsert, NicknameUpdate, ActivitySync, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])



@router.patch("/{tg_id}", response_model=UserOut)
def update_user_profile(tg_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.nickname is not None:
        # Check if nickname already taken
        existing = db.query(User).filter(User.nickname == data.nickname, User.tg_id != tg_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Этот никнейм уже занят")
        user.nickname = data.nickname
    
    if data.bio is not None:
        user.bio = data.bio
        
    if data.accent_color is not None:
        user.accent_color = data.accent_color
        
    db.commit()
    db.refresh(user)
    return user


import os


@router.post("/upsert", response_model=UserOut)
def upsert_user(data: UserUpsert, db: Session = Depends(get_db)):
    """Create or update user from Telegram WebApp initData."""
    admin_username = os.getenv("ADMIN_USERNAME", "insafbober")
    
    user = db.query(User).filter(User.tg_id == data.tg_id).first()
    if user:
        user.username = data.username
        user.first_name = data.first_name
        user.last_name = data.last_name
        if data.photo_url:
            user.photo_url = data.photo_url
        
        # Check if user should be admin based on username
        if data.username == admin_username:
            user.is_admin = True
            
        user.last_active = datetime.utcnow()
    else:
        # Check if new user should be admin
        is_admin = data.username == admin_username
        
        user = User(
            tg_id=data.tg_id,
            username=data.username,
            first_name=data.first_name,
            last_name=data.last_name,
            photo_url=data.photo_url,
            is_admin=is_admin
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user


@router.get("/{tg_id}", response_model=UserOut)
def get_user(tg_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{tg_id}/nickname")
def update_nickname(tg_id: int, data: NicknameUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if nickname already taken
    existing = db.query(User).filter(User.nickname == data.nickname, User.tg_id != tg_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Этот никнейм уже занят")
        
    user.nickname = data.nickname
    db.commit()
    return {"status": "success", "nickname": user.nickname}


@router.post("/activity")
def sync_activity(data: ActivitySync, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == data.user_tg_id).first()
    if user:
        user.total_seconds_spent += data.seconds
        user.last_active = datetime.utcnow()
    
    if data.story_id:
        story = db.query(Story).filter(Story.id == data.story_id).first()
        if story:
            story.total_seconds_spent += data.seconds
            
    db.commit()
    return {"status": "synced"}
