from sqlalchemy.orm import Session
from app.database.models import Event, EventParticipant

def create_event(session: Session, title: str, description: str | None, event_type: str, criteria: list, review_timeout_hours: int, created_by: int):
    event = Event(
        title=title,
        description=description if description else "",
        event_type=event_type,
        criteria=criteria,
        review_timeout_hours=review_timeout_hours,
        created_by=created_by,
        status="draft"
    )

    session.add(event)
    session.flush()
    
    participant = EventParticipant(
        event_id=event.id,
        user_id=created_by,
        role="organizer"
    )
    session.add(participant)
    session.commit()
    
    return event

def get_user_events(session: Session, user_id: int):
    return session.query(Event).join(EventParticipant).filter(
        EventParticipant.user_id == user_id
    ).all()

def get_event_by_id(session: Session, event_id: int):
    return session.query(Event).filter(Event.id == event_id).first()
