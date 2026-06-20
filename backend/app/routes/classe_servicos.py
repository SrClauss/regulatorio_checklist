from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.models.classe_servico import ClasseServicoCreate, ClasseServicoResponse, ClasseServicoUpdate, ClasseServicoDB
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/classe-servicos", tags=["Classes de Serviço"])

allow_staff = RoleChecker(["admin", "consultor"])

@router.post("", response_model=ClasseServicoResponse, status_code=status.HTTP_201_CREATED)
async def create_class_of_service(class_in: ClasseServicoCreate, current_user: UsuarioDB = Depends(allow_staff)):
    """Cadastra uma nova classe de serviço (Admins e Consultores)."""
    db = get_database()
    
    # Se um prestador_id foi passado, valida se ele existe
    if class_in.prestador_id:
        provider = await db.prestadores.find_one({"_id": ObjectId(class_in.prestador_id)})
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O prestador de serviço informado não existe."
            )
            
    class_db = ClasseServicoDB(**class_in.model_dump(by_alias=True))
    result = await db.classe_servicos.insert_one(class_db.model_dump(by_alias=True, exclude={"id"}))
    class_dict = await db.classe_servicos.find_one({"_id": result.inserted_id})
    return ClasseServicoResponse(**class_dict)

@router.get("", response_model=List[ClasseServicoResponse])
async def list_classes_of_service(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Lista todas as classes de serviço cadastradas (Todos os usuários autenticados)."""
    db = get_database()
    classes_cursor = db.classe_servicos.find()
    classes = await classes_cursor.to_list(length=1000)
    return [ClasseServicoResponse(**c) for c in classes]

@router.get("/{class_id}", response_model=ClasseServicoResponse)
async def get_class_of_service_by_id(class_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de uma classe de serviço específica."""
    db = get_database()
    class_dict = await db.classe_servicos.find_one({"_id": ObjectId(class_id)})
    if not class_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classe de serviço não encontrada"
        )
    return ClasseServicoResponse(**class_dict)

@router.put("/{class_id}", response_model=ClasseServicoResponse)
async def update_class_of_service(
    class_id: str, 
    class_in: ClasseServicoUpdate, 
    current_user: UsuarioDB = Depends(allow_staff)
):
    """Atualiza dados de uma classe de serviço cadastrada (Admins e Consultores)."""
    db = get_database()
    
    update_data = class_in.model_dump(exclude_unset=True)
    if "prestador_id" in update_data and update_data["prestador_id"] is not None:
        provider = await db.prestadores.find_one({"_id": ObjectId(update_data["prestador_id"])})
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O prestador de serviço informado não existe."
            )
            
    if not update_data:
        class_dict = await db.classe_servicos.find_one({"_id": ObjectId(class_id)})
        if not class_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe de serviço não encontrada")
        return ClasseServicoResponse(**class_dict)
        
    result = await db.classe_servicos.find_one_and_update(
        {"_id": ObjectId(class_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classe de serviço não encontrada"
        )
        
    return ClasseServicoResponse(**result)

@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class_of_service(class_id: str, current_user: UsuarioDB = Depends(allow_staff)):
    """Inativa uma classe de serviço (Admins e Consultores)."""
    db = get_database()
    result = await db.classe_servicos.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": {"ativo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classe de serviço não encontrada"
        )
    return None
