from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.models.usuario import UsuarioCreate, UsuarioResponse, UsuarioLogin, UsuarioDB
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.auth.dependencies import get_current_active_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

@router.post("/register-initial-admin", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register_initial_admin(user_in: UsuarioCreate, db = Depends(get_database)):
    """Cria o primeiro usuário administrador do sistema se não houver nenhum usuário cadastrado ainda."""
    
    # Verifica se já existem usuários cadastrados
    count = await db.usuarios.count_documents({})
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O administrador inicial já foi criado. Cadastro normal deve ser feito por um administrador."
        )
        
    # Garante que a role seja admin
    user_in.role = "admin"
    
    hashed_password = get_password_hash(user_in.senha)
    
    user_db = UsuarioDB(
        nome=user_in.nome,
        email=user_in.email,
        role=user_in.role,
        empresa_cliente_id=user_in.empresa_cliente_id,
        telefone=user_in.telefone,
        ativo=user_in.ativo,
        senha_hash=hashed_password
    )
    
    # Salva no MongoDB
    result = await db.usuarios.insert_one(user_db.model_dump(by_alias=True, exclude={"id"}))
    user_dict = await db.usuarios.find_one({"_id": result.inserted_id})
    
    return UsuarioResponse(**user_dict)
 
@router.post("/login")
async def login(login_data: UsuarioLogin, db = Depends(get_database)):
    """Autentica o usuário com email e senha e retorna um token de acesso JWT."""
    
    user_dict = await db.usuarios.find_one({"email": login_data.email})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )
        
    user = UsuarioDB(**user_dict)
    if not verify_password(login_data.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )
        
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta de usuário inativa"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "nome": user.nome,
            "email": user.email,
            "role": user.role,
            "empresa_cliente_id": str(user.empresa_cliente_id) if user.empresa_cliente_id else None
        }
    }

@router.get("/me", response_model=UsuarioResponse)
async def read_users_me(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Retorna os dados do usuário autenticado atual."""
    return current_user
