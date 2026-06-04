from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.models.empresa import EmpresaCreate, EmpresaResponse, EmpresaUpdate, EmpresaDB
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

# Dependências de Roles
allow_staff = RoleChecker(["admin", "consultor"])

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
async def create_company(company_in: EmpresaCreate, current_user: UsuarioDB = Depends(allow_staff)):
    """Cadastra uma nova empresa cliente no sistema (Admins e Consultores)."""
    db = get_database()
    
    # Verifica se o CNPJ já está cadastrado
    existing_company = await db.empresas.find_one({"cnpj": company_in.cnpj})
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uma empresa com este CNPJ já está cadastrada no sistema."
        )
        
    company_db = EmpresaDB(**company_in.model_dump(by_alias=True))
    
    result = await db.empresas.insert_one(company_db.model_dump(by_alias=True, exclude={"id"}))
    company_dict = await db.empresas.find_one({"_id": result.inserted_id})
    return EmpresaResponse(**company_dict)

@router.get("", response_model=List[EmpresaResponse])
async def list_companies(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Lista empresas de acordo com o nível de acesso do usuário logado.
    - Admin: Vê todas as empresas.
    - Consultor: Vê apenas as empresas sob sua responsabilidade.
    - Cliente: Vê apenas a sua própria empresa.
    """
    db = get_database()
    
    query = {}
    if current_user.role == "cliente":
        if not current_user.empresa_cliente_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário do tipo cliente não está associado a nenhuma empresa no sistema"
            )
        query = {"_id": current_user.empresa_cliente_id}
    elif current_user.role == "consultor":
        query = {"responsavel_principal_id": current_user.id}
        
    companies_cursor = db.empresas.find(query)
    companies = await companies_cursor.to_list(length=1000)
    return [EmpresaResponse(**c) for c in companies]

@router.get("/{empresa_id}", response_model=EmpresaResponse)
async def get_company_by_id(empresa_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de uma empresa específica com base nas permissões do usuário."""
    db = get_database()
    
    # Valida restrições de escopo
    if current_user.role == "cliente" and str(current_user.empresa_cliente_id) != empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para esta empresa"
        )
        
    company_dict = await db.empresas.find_one({"_id": ObjectId(empresa_id)})
    if not company_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
        
    company = EmpresaDB(**company_dict)
    
    if current_user.role == "consultor" and company.responsavel_principal_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é o consultor responsável por esta empresa"
        )
        
    return EmpresaResponse(**company_dict)

@router.put("/{empresa_id}", response_model=EmpresaResponse)
async def update_company(empresa_id: str, company_in: EmpresaUpdate, current_user: UsuarioDB = Depends(allow_staff)):
    """Atualiza dados de uma empresa cadastrada (Admins e Consultores)."""
    db = get_database()
    
    # Se for consultor, verifica se é o responsável por esta empresa antes de permitir edição
    if current_user.role == "consultor":
        company_dict = await db.empresas.find_one({"_id": ObjectId(empresa_id)})
        if not company_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada"
            )
        company = EmpresaDB(**company_dict)
        if company.responsavel_principal_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para editar empresas de outros consultores"
            )
            
    update_data = company_in.model_dump(exclude_unset=True)
    if not update_data:
        company_dict = await db.empresas.find_one({"_id": ObjectId(empresa_id)})
        return EmpresaResponse(**company_dict)
        
    result = await db.empresas.find_one_and_update(
        {"_id": ObjectId(empresa_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
        
    return EmpresaResponse(**result)

@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(empresa_id: str, current_user: UsuarioDB = Depends(RoleChecker(["admin"]))):
    """Inativa/Exclui uma empresa do sistema (Apenas administradores)."""
    db = get_database()
    result = await db.empresas.update_one(
        {"_id": ObjectId(empresa_id)},
        {"$set": {"ativo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    return None
