from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.story import User
from app.schemas.story import UserOut, UserUpsert

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/upsert", response_model=UserOut)
def upsert_user(data: UserUpsert, db: Session = Depends(get_db)):
    """Create or update user from Telegram WebApp initData."""
    user = db.query(User).filter(User.tg_id == data.tg_id).first()
    if user:
        user.username = data.username
        user.first_name = data.first_name
        user.last_name = data.last_name
        if data.photo_url:
            user.photo_url = data.photo_url
        user.last_active = datetime.utcnow()
    else:
        user = User(
            tg_id=data.tg_id,
            username=data.username,
            first_name=data.first_name,
            last_name=data.last_name,
            photo_url=data.photo_url,
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
