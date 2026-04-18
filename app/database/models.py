from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
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
