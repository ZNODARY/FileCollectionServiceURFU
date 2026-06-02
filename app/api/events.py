import secrets
import string
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.database.base import get_session
from app.database.models import Event, EventParticipant, EventInvite
from app.services.event import create_event, get_user_events

router = APIRouter()

class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    criteria: list = []
    review_timeout_hours: int = 48
    peer_review_count: Optional[int] = 2

def generate_invite_code():
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

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

@router.post("/{event_id}/invites")
def create_invite(event_id: int, request: Request):
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
        raise HTTPException(status_code=403, detail="Only organizer can create invites")
    
    code = generate_invite_code()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    invite = EventInvite(
        code=code,
        event_id=event_id,
        role="performer",
        expires_at=expires_at.replace(tzinfo=None)
    )
    session.add(invite)
    session.commit()
    
    invite_link = f"/join?code={code}"
    
    return {"code": code, "link": invite_link, "expires_at": expires_at.isoformat()}


@router.post("/join")
def join_by_code(data: dict, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    code = data.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    
    session = get_session()
    
    invite = session.query(EventInvite).filter_by(
        code=code,
        is_used=0
    ).first()
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")
    
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if invite.expires_at < now_naive:
        raise HTTPException(status_code=400, detail="Invite expired")
    
    existing = session.query(EventParticipant).filter_by(
        event_id=invite.event_id,
        user_id=user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already a participant")
    
    participant = EventParticipant(
        event_id=invite.event_id,
        user_id=user_id,
        role=invite.role
    )
    session.add(participant)
    
    invite.is_used = 1
    invite.used_by = user_id
    invite.used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    
    session.commit()
    
    return {"message": "Joined successfully", "event_id": invite.event_id}

@router.get("/{event_id}/is-organizer")
def is_organizer(event_id: int, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        return {"is_organizer": False}
    
    session = get_session()
    
    participant = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=user_id,
        role="organizer"
    ).first()
    
    return {"is_organizer": participant is not None}


@router.get("/{event_id}/participants")
def get_event_participants(event_id: int, request: Request):
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
        raise HTTPException(status_code=403, detail="Only organizer can view participants")
    
    participants = session.query(EventParticipant).filter_by(event_id=event_id).all()
    
    return [
        {
            "user_id": p.user_id,
            "user_email": p.user.email,
            "user_full_name": p.user.full_name,
            "role": p.role,
            "joined_at": p.joined_at.isoformat()
        }
        for p in participants
    ]

@router.delete("/{event_id}/participants/{user_id}")
def remove_participant(event_id: int, user_id: int, request: Request):
    current_user_id = request.session.get("user_id")
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    
    event = session.query(Event).get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    current_participant = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=current_user_id,
        role="organizer"
    ).first()
    
    if not current_participant:
        raise HTTPException(status_code=403, detail="Only organizer can remove participants")
    
    if current_user_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")
    
    participant_to_remove = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=user_id
    ).first()
    
    if not participant_to_remove:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    session.delete(participant_to_remove)
    session.commit()
    
    return {"message": "Participant removed successfully"}
    
@router.delete("/{event_id}")
def delete_event(event_id: int, request: Request):
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
        raise HTTPException(status_code=403, detail="Only organizer can delete event")
    
    # Удаляем все связанные данные (каскадно)
    session.delete(event)
    session.commit()
    
    return {"message": "Event deleted successfully"}