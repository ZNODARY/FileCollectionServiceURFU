import random
from sqlalchemy.orm import Session
from app.database.models import Event, EventParticipant, Work, Review

def distribute_peer_reviews(session: Session, event_id: int):
    event = session.query(Event).get(event_id)
    if not event:
        return {"error": "Event not found"}
    
    if event.event_type != "peer":
        return {"error": "Event is not peer review type"}
    
    performers = session.query(EventParticipant).filter_by(
        event_id=event_id,
        role="performer"
    ).all()
    
    performer_ids = [p.user_id for p in performers]
    
    if len(performer_ids) < 3:
        return {"error": "Need at least 3 performers for peer review"}
    
    works = session.query(Work).filter_by(event_id=event_id).all()
    
    user_work_map = {w.author_id: w for w in works}
    
    for user_id in performer_ids:
        if user_id not in user_work_map:
            return {"error": f"User {user_id} has not uploaded a work"}
    
    reviews_created = 0
    
    for reviewer_id in performer_ids:
        available_works = [
            work for work in works 
            if work.author_id != reviewer_id
        ]
        
        selected_works = random.sample(
            available_works, 
            min(event.peer_review_count, len(available_works))
        )
        
        for work in selected_works:
            existing = session.query(Review).filter_by(
                work_id=work.id,
                reviewer_id=reviewer_id
            ).first()
            
            if not existing:
                review = Review(
                    work_id=work.id,
                    reviewer_id=reviewer_id,
                    author_id=work.author_id,
                    status="assigned"
                )
                session.add(review)
                reviews_created += 1
    
    session.commit()
    return {"success": True, "reviews_created": reviews_created}