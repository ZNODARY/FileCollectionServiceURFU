from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.database.base import get_session
from app.services.work import create_work, get_user_works

router = APIRouter()

class CreateWorkRequest(BaseModel):
    event_id: int
    title: str
    link: str

@router.post("/")
def upload_work(data: CreateWorkRequest, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    try:
        work = create_work(
            session=session,
            event_id=data.event_id,
            title=data.title,
            link=data.link,
            author_id=user_id
        )
        return {"message": "Work uploaded", "work_id": work.id}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/my")
def get_my_works(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    works = get_user_works(session, user_id)
    
    return [
        {
            "id": w.id,
            "title": w.title,
            "link": w.link,
            "status": w.status,
            "event_id": w.event_id,
            "created_at": w.created_at.isoformat()
        }
        for w in works
    ]
