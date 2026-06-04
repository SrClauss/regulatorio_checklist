from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from bson import ObjectId
from app.config import settings
from app.database import get_database
from app.models.usuario import UsuarioDB

# Define a rota onde o cliente deve autenticar para obter o token (OAuth2 standard)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_database)) -> UsuarioDB:
    """Decodifica o token JWT e recupera o usuário ativo no banco de dados."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação inválidas ou expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Busca o usuário pelo ID do MongoDB
    user_dict = await db.usuarios.find_one({"_id": ObjectId(user_id)})
    if user_dict is None:
        raise credentials_exception
        
    return UsuarioDB(**user_dict)

async def get_current_active_user(current_user: UsuarioDB = Depends(get_current_user)) -> UsuarioDB:
    """Verifica se o usuário autenticado está ativo."""
    if not current_user.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário desativado no sistema"
        )
    return current_user

class RoleChecker:
    """Classe injetável para verificar se o usuário ativo pertence a uma das roles permitidas."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: UsuarioDB = Depends(get_current_active_user)) -> UsuarioDB:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso não autorizado para esta funcionalidade"
            )
        return current_user
