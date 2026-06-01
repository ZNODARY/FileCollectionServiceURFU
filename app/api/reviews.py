from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.database.base import get_session
from app.database.models import Review, Work, EventParticipant

router = APIRouter()

class SubmitReviewRequest(BaseModel):
    text_comment: Optional[str] = None

@router.get("/next")
def get_next_work(request: Request, event_id: int):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    
    participant = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=user_id,
        role="reviewer"
    ).first()
    
    if not participant:
        return {"work": None, "message": "You are not a reviewer in this event"}
    
    work = session.query(Work).filter(
        Work.event_id == event_id,
        Work.status == "pending",
        Work.author_id != user_id
    ).first()
    
    if not work:
        return {"work": None, "message": "No works available"}
    
    review = Review(
        work_id=work.id,
        reviewer_id=user_id,
        author_id=work.author_id,
        status="assigned"
    )
    work.status = "assigned"  # type: ignore
    session.add(review)
    session.commit()
    
    return {
        "work": {
            "id": work.id,
            "title": work.title,
            "link": work.link
        }
    }

@router.post("/{work_id}/submit")
def submit_review(work_id: int, data: SubmitReviewRequest, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    
    review = session.query(Review).filter_by(
        work_id=work_id,
        reviewer_id=user_id,
        status="assigned"
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.text_comment = data.text_comment  # type: ignore
    review.status = "completed"
    review.completed_at = datetime.now(timezone.utc)
    
    work = review.work
    work.status = "reviewed"  # type: ignore
    
    session.commit()
    
    return {"message": "Review submitted"}

@router.get("/my")
def get_my_reviews(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    reviews = session.query(Review).filter_by(
        reviewer_id=user_id,
        status="completed"
    ).all()
    
    return [
        {
            "id": r.id,
            "work_title": r.work.title,
            "text_comment": r.text_comment,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None
        }
        for r in reviews
    ]

@router.get("/for-me")
def get_reviews_for_me(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    reviews = session.query(Review).filter_by(
        author_id=user_id,
        status="completed"
    ).all()
    
    return [
        {
            "id": r.id,
            "work_title": r.work.title,
            "reviewer_name": r.reviewer.full_name or str(r.reviewer.id),
            "text_comment": r.text_comment,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None
        }
        for r in reviews
    ]
    