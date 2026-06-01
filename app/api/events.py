from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.database.base import get_session
from app.database.models import Event, EventParticipant
from app.services.event import create_event, get_user_events

router = APIRouter()

class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    criteria: list = []
    review_timeout_hours: int = 48
    peer_review_count: Optional[int] = 2

@router.post("/")
def create_event_endpoint(data: CreateEventRequest, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    event = create_event(
        session=session,
        title=data.title,
        description=data.description,
        event_type=data.event_type,
        criteria=data.criteria,
        review_timeout_hours=data.review_timeout_hours,
        created_by=user_id,
        peer_review_count=data.peer_review_count 
    )
    
    return {"message": "Event created", "event_id": event.id}

@router.get("/my")
def get_my_events(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    events = get_user_events(session, user_id)
    
    return [
        {
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "event_type": e.event_type,
            "status": e.status,
            "created_at": e.created_at.isoformat()
        }
        for e in events
    ]

@router.post("/{event_id}/start")
def start_event(event_id: int, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    
    event = session.query(Event).get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participant = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=user_id,
        role="organizer"
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Only organizer can start event")
    
    if event.status != "draft":
        raise HTTPException(status_code=400, detail="Event already started")
    
    if event.event_type == "peer":
        from app.services.distribution import distribute_peer_reviews
        result = distribute_peer_reviews(session, event_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
    
    event.status = "active"
    event.started_at = datetime.now(timezone.utc)
    session.commit()
    
    return {"message": "Event started", "reviews_created": result.get("reviews_created", 0) if event.event_type == "peer" else 0}
