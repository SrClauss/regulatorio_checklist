from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.models.prestador import PrestadorCreate, PrestadorResponse, PrestadorUpdate, PrestadorDB
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/prestadores", tags=["Prestadores de Serviço"])

allow_staff = RoleChecker(["admin", "consultor"])

@router.post("", response_model=PrestadorResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(provider_in: PrestadorCreate, current_user: UsuarioDB = Depends(allow_staff)):
    """Cadastra um novo prestador de serviço (Admins e Consultores)."""
    db = get_database()
    
    provider_db = PrestadorDB(**provider_in.model_dump(by_alias=True))
    result = await db.prestadores.insert_one(provider_db.model_dump(by_alias=True, exclude={"id"}))
    provider_dict = await db.prestadores.find_one({"_id": result.inserted_id})
    return PrestadorResponse(**provider_dict)

@router.get("", response_model=List[PrestadorResponse])
async def list_providers(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Lista todos os prestadores cadastrados no sistema (Todos os usuários autenticados)."""
    db = get_database()
    providers_cursor = db.prestadores.find()
    providers = await providers_cursor.to_list(length=1000)
    return [PrestadorResponse(**p) for p in providers]

@router.get("/{provider_id}", response_model=PrestadorResponse)
async def get_provider_by_id(provider_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de um prestador de serviço específico."""
    db = get_database()
    provider_dict = await db.prestadores.find_one({"_id": ObjectId(provider_id)})
    if not provider_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prestador de serviço não encontrado"
        )
    return PrestadorResponse(**provider_dict)

@router.put("/{provider_id}", response_model=PrestadorResponse)
async def update_provider(
    provider_id: str, 
    provider_in: PrestadorUpdate, 
    current_user: UsuarioDB = Depends(allow_staff)
):
    """Atualiza dados de um prestador cadastrado (Admins e Consultores)."""
    db = get_database()
    
    update_data = provider_in.model_dump(exclude_unset=True)
    if not update_data:
        provider_dict = await db.prestadores.find_one({"_id": ObjectId(provider_id)})
        if not provider_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prestador não encontrado")
        return PrestadorResponse(**provider_dict)
        
    result = await db.prestadores.find_one_and_update(
        {"_id": ObjectId(provider_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prestador de serviço não encontrado"
        )
        
    return PrestadorResponse(**result)

@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(provider_id: str, current_user: UsuarioDB = Depends(allow_staff)):
    """Inativa/Remove um prestador de serviço do sistema (Admins e Consultores)."""
    db = get_database()
    result = await db.prestadores.update_one(
        {"_id": ObjectId(provider_id)},
        {"$set": {"ativo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prestador de serviço não encontrado"
        )
    return None
