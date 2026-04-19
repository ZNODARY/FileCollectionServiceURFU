from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="performer")
    created_at = Column(DateTime, default=utc_now)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    event_type = Column(String(50), nullable=False)
    status = Column(String(50), default="draft")
    criteria = Column(JSON)
    review_timeout_hours = Column(Integer, default=48)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utc_now)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    
    creator = relationship("User", foreign_keys=[created_by])

class EventParticipant(Base):
    __tablename__ = "event_participants"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="unique_event_participant"),)
    
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(50), nullable=False)
    joined_at = Column(DateTime, default=utc_now)

    event = relationship("Event", foreign_keys=[event_id])
    user = relationship("User", foreign_keys=[user_id])

class Work(Base):
    __tablename__ = "works"
    
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    title = Column(String(200))
    link = Column(String(500))
    author_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=utc_now)
    
    event = relationship("Event", foreign_keys=[event_id])
    author = relationship("User", foreign_keys=[author_id])
