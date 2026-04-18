from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from app.database.base import get_session
from app.database.models import User
from app.core.security import hash_password, verify_password

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(data: RegisterRequest, request: Request):
    session = get_session()
    
    existing = session.query(User).filter_by(email=data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="performer"
    )
    session.add(user)
    session.commit()
    
    request.session["user_id"] = user.id
    
    return {"message": "Registered successfully", "user_id": user.id}


@router.post("/login")
def login(data: LoginRequest, request: Request):
    session = get_session()
    
    user = session.query(User).filter_by(email=data.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.hashed_password): # type: ignore
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    request.session["user_id"] = user.id
    
    return {"message": "Logged in", "user_id": user.id, "role": user.role}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}


@router.get("/me")
def me(request: Request):
    session = get_session()
    user_id = request.session.get("user_id")
    if not user_id:
        return {"authenticated": False}
    
    user = session.query(User).get(user_id)
    
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }
