from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.database.base import get_session
from app.services.event import create_event, get_user_events

router = APIRouter()

class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    criteria: List[dict] = []
    review_timeout_hours: int = 48

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
        created_by=user_id
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
