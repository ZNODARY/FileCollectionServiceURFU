from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import load_config
from app.database.base import init_db
from app.api import auth_router

config = load_config()

app = FastAPI(title="Review Service API")

app.add_middleware(SessionMiddleware, secret_key=config.secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
