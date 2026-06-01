from sqlalchemy.orm import Session
from app.database.models import Review

def get_assigned_works(session: Session, reviewer_id: int):
    reviews = session.query(Review).filter(
        Review.reviewer_id == reviewer_id,
        Review.status == "assigned"
    ).all()
    return [r.work for r in reviews]
