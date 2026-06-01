import hashlib
import argon2

ph = argon2.PasswordHasher()

def hash_password(password: str) -> str:
    hashed = hashlib.sha256(password.encode()).hexdigest()
    return ph.hash(hashed)

def verify_password(plain: str, hashed: str) -> bool:
    hashed_plain = hashlib.sha256(plain.encode()).hexdigest()
    try:
        ph.verify(hashed, hashed_plain)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False