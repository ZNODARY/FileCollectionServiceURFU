import hashlib
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    hashed = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(hashed)

def verify_password(plain: str, hashed: str) -> bool:
    hashed_plain = hashlib.sha256(plain.encode()).hexdigest()
    return pwd_context.verify(hashed_plain, hashed)
