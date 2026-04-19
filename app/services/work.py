from sqlalchemy.orm import Session
from app.database.models import Work, EventParticipant

def create_work(session: Session, event_id: int, title: str, link: str, author_id: int):
    participant = session.query(EventParticipant).filter_by(
        event_id=event_id,
        user_id=author_id
    ).first()
    
    if not participant:
        raise ValueError("User is not a participant of this event")
    
    work = Work(
        event_id=event_id,
        title=title,
        link=link,
        author_id=author_id,
        status="pending"
    )
    session.add(work)
    session.commit()
    
    return work

def get_user_works(session: Session, user_id: int):
    return session.query(Work).filter_by(author_id=user_id).all()
