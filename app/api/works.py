from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from app.database.base import get_session
from app.services.work import create_work, get_user_works
from app.database.models import Work

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

@router.get("/{work_id}")
def get_work(work_id: int, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session()
    work = session.query(Work).get(work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    
    return {
        "id": work.id,
        "title": work.title,
        "link": work.link,
        "status": work.status,
        "event_id": work.event_id
    }
