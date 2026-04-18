from dataclasses import dataclass
from environs import Env

@dataclass
class Config:
    secret_key: str
    database_url: str
    whisper_model_size: str

def load_config() -> Config:
    env = Env()
    env.read_env()
    
    return Config(
        secret_key=env.str("SECRET_KEY", "change_me"),
        database_url=env.str("DATABASE_URL", "sqlite:///./data/database.db"),
        whisper_model_size=env.str("WHISPER_MODEL_SIZE", "tiny")
    )
