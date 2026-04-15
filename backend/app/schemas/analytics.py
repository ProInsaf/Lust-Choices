from pydantic import BaseModel
from typing import Optional

class EventCreate(BaseModel):
    user_tg_id: Optional[int] = None
    event_type: str # 'app_open', 'story_started', 'story_completed', etc.
    story_id: Optional[str] = None
    metadata_json: Optional[str] = None
