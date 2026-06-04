from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.models.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate, UsuarioDB
from app.auth.security import get_password_hash
from app.auth.dependencies import RoleChecker, get_current_active_user

router = APIRouter(prefix="/api/usuarios", tags=["Usuários"])

# Dependências de Roles
allow_admin = RoleChecker(["admin"])
allow_staff = RoleChecker(["admin", "consultor"])

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UsuarioCreate, current_user: UsuarioDB = Depends(allow_admin)):
    """Cadastra um novo usuário no sistema (Apenas administradores)."""
    db = get_database()
    
    # Verifica se o email já está cadastrado
    existing_user = await db.usuarios.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está cadastrado no sistema."
        )
        
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
    
    result = await db.usuarios.insert_one(user_db.model_dump(by_alias=True, exclude={"id"}))
    user_dict = await db.usuarios.find_one({"_id": result.inserted_id})
    return UsuarioResponse(**user_dict)

@router.get("", response_model=List[UsuarioResponse])
async def list_users(current_user: UsuarioDB = Depends(allow_admin)):
    """Lista todos os usuários cadastrados (Apenas administradores)."""
    db = get_database()
    users_cursor = db.usuarios.find()
    users = await users_cursor.to_list(length=1000)
    return [UsuarioResponse(**u) for u in users]

@router.get("/consultores", response_model=List[UsuarioResponse])
async def list_consultants(current_user: UsuarioDB = Depends(allow_staff)):
    """Lista apenas os usuários com a role 'consultor' ou 'admin' (Acessível por admins e consultores)."""
    db = get_database()
    consultants_cursor = db.usuarios.find({"role": {"$in": ["consultor", "admin"]}, "ativo": True})
    consultants = await consultants_cursor.to_list(length=1000)
    return [UsuarioResponse(**c) for c in consultants]

@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_user_by_id(usuario_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de um usuário específico (Acessível por admins, ou se for o próprio usuário buscando seus dados)."""
    if current_user.role != "admin" and str(current_user.id) != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para esta conta"
        )
        
    db = get_database()
    user_dict = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    return UsuarioResponse(**user_dict)

@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_user(usuario_id: str, user_in: UsuarioUpdate, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Atualiza dados do usuário (Admins editam qualquer usuário, usuários normais editam apenas a si mesmos)."""
    if current_user.role != "admin" and str(current_user.id) != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar este perfil"
        )
        
    db = get_database()
    
    # Prepara dicionário de update
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Se houver alteração de senha
    if "senha" in update_data:
        update_data["senha_hash"] = get_password_hash(update_data.pop("senha"))
        
    # Usuários comuns não podem alterar suas próprias roles ou status ativos
    if current_user.role != "admin":
        update_data.pop("role", None)
        update_data.pop("ativo", None)
        update_data.pop("empresa_cliente_id", None)

    if not update_data:
        # Nada a alterar, busca o atual e retorna
        user_dict = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        return UsuarioResponse(**user_dict)

    result = await db.usuarios.find_one_and_update(
        {"_id": ObjectId(usuario_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
        
    return UsuarioResponse(**result)

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(usuario_id: str, current_user: UsuarioDB = Depends(allow_admin)):
    """Inativa um usuário do sistema (Apenas administradores)."""
    db = get_database()
    result = await db.usuarios.update_one(
        {"_id": ObjectId(usuario_id)},
        {"$set": {"ativo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    return None
