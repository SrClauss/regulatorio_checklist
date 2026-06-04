from datetime import timedelta
from jose import jwt
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.config import settings

def test_password_hashing():
    """Testa se a geração e validação de hashes de senha estão corretas."""
    password = "minhasenhasecreta"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert len(hashed) > 20
    assert verify_password(password, hashed) is True
    assert verify_password("senhaerrada", hashed) is False

def test_password_truncation_safety():
    """Testa se senhas longas (>72 caracteres) são gerenciadas corretamente pelo hash."""
    password_longa = "a" * 100
    hashed = get_password_hash(password_longa)
    assert verify_password(password_longa, hashed) is True

def test_create_jwt_token():
    """Testa se a geração de tokens JWT cria uma assinatura válida decodificável."""
    user_id = "507f1f77bcf86cd799439011"
    token = create_access_token(subject=user_id, expires_delta=timedelta(minutes=15))
    
    assert token is not None
    assert isinstance(token, str)
    
    # Decodifica para checar os claims
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == user_id
    assert "exp" in payload
