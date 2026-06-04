from datetime import datetime, timedelta
from typing import Optional, Any
import bcrypt
from jose import jwt
from app.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto puro corresponde ao hash bcrypt cadastrado."""
    try:
        # bcrypt espera bytes para fazer a comparação e suporta no máximo 72 bytes
        plain_bytes = plain_password.encode("utf-8")
        plain_truncated = plain_bytes[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_truncated, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Gera o hash bcrypt para a senha fornecida (máximo de 72 bytes)."""
    pwd_bytes = password.encode("utf-8")
    # Limita o password a 72 bytes, que é o máximo suportado pelo algoritmo bcrypt
    pwd_truncated = pwd_bytes[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_truncated, salt)
    return hashed.decode("utf-8")

def create_access_token(subject: Any, expires_delta: Optional[timedelta] = None) -> str:
    """Gera um token JWT com data de expiração."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Payload contendo o ID do usuário (subject) e data de expiração
    to_encode = {"exp": expire, "sub": str(subject)}
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt
