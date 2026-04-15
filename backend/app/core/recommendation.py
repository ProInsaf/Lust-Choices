from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.story import Story
from app.models.recommendation import UserTagScore

def update_user_tag_scores(db: Session, user_tg_id: int, tags: list, detail_value: float = 1.0):
    """
    Updates the scores of specific tags for the given user. 
    Detail value is the weight (e.g. 1.0 for completed story, 0.5 for started).
    """
    if not tags: return
    for tag in tags:
        record = db.query(UserTagScore).filter(UserTagScore.user_tg_id == user_tg_id, UserTagScore.tag == tag).first()
        if not record:
            record = UserTagScore(user_tg_id=user_tg_id, tag=tag, score=0.0)
            db.add(record)
        record.score += detail_value
    db.commit()

def get_recommended_stories_for_user(db: Session, user_tg_id: int, limit: int = 10):
    """
    Gets recommended stories using tag affinities.
    Algorithm:
    1. Fetch top tags the user likes.
    2. Query stories that have those tags, order by score/popularity if possible.
    """
    user_scores = db.query(UserTagScore).filter(UserTagScore.user_tg_id == user_tg_id)\
                    .order_by(desc(UserTagScore.score)).limit(3).all()
    
    # If no history, default to popular/top liked
    if not user_scores:
        return db.query(Story).order_by(desc(Story.plays_count), desc(Story.likes_count)).limit(limit).all()
        
    top_tags = [score.tag for score in user_scores]
    
    # Python-side matching to avoid complex postgresql array overlap syntax issues
    all_active = db.query(Story).filter(Story.status == "approved").all()
    
    def calculate_score(story: Story):
        score = story.likes_count * 0.1 + story.plays_count * 0.05
        # Add tag affinity match
        for tag in story.tags:
            if tag in top_tags:
                score += 50 # high weight for tagged matching
        return score
        
    all_active.sort(key=calculate_score, reverse=True)
    return all_active[:limit]
