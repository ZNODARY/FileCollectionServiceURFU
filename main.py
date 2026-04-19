from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import load_config
from app.database.base import init_db
from app.api import auth_router

config = load_config()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Start application")
    init_db()
    print("Database initialized")
    yield
    print("Shutting down...")

app = FastAPI(title="Review Service API", lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key=config.secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
