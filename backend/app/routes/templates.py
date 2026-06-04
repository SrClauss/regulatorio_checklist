from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.models.template import TemplateDocumentoCreate, TemplateDocumentoResponse, TemplateDocumentoUpdate, TemplateDocumentoDB
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/templates", tags=["Templates de Documentos"])

# Permite acesso para admins e consultores (equipe técnica)
allow_staff = RoleChecker(["admin", "consultor"])

@router.post("", response_model=TemplateDocumentoResponse, status_code=status.HTTP_201_CREATED)
async def create_template(template_in: TemplateDocumentoCreate, current_user: UsuarioDB = Depends(allow_staff)):
    """Cria um novo template de documento e condicionantes (Admins e Consultores)."""
    db = get_database()
    
    template_db = TemplateDocumentoDB(**template_in.model_dump(by_alias=True))
    result = await db.templates_documentos.insert_one(template_db.model_dump(by_alias=True, exclude={"id"}))
    template_dict = await db.templates_documentos.find_one({"_id": result.inserted_id})
    return TemplateDocumentoResponse(**template_dict)

@router.get("", response_model=List[TemplateDocumentoResponse])
async def list_templates(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Lista todos os templates cadastrados no sistema."""
    db = get_database()
    templates_cursor = db.templates_documentos.find()
    templates = await templates_cursor.to_list(length=1000)
    return [TemplateDocumentoResponse(**t) for t in templates]

@router.get("/segmento/{segmento}", response_model=List[TemplateDocumentoResponse])
async def list_templates_by_segment(segmento: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Lista templates filtrados por segmento de negócio (ex: Alimentos, Posto de Combustíveis)."""
    db = get_database()
    # Busca com case-insensitive regex
    templates_cursor = db.templates_documentos.find({"segmento": {"$regex": segmento, "$options": "i"}})
    templates = await templates_cursor.to_list(length=1000)
    return [TemplateDocumentoResponse(**t) for t in templates]

@router.put("/{template_id}", response_model=TemplateDocumentoResponse)
async def update_template(template_id: str, template_in: TemplateDocumentoUpdate, current_user: UsuarioDB = Depends(allow_staff)):
    """Atualiza dados e condicionantes associadas de um template (Admins e Consultores)."""
    db = get_database()
    
    update_data = template_in.model_dump(exclude_unset=True)
    if not update_data:
        template_dict = await db.templates_documentos.find_one({"_id": ObjectId(template_id)})
        return TemplateDocumentoResponse(**template_dict)
        
    result = await db.templates_documentos.find_one_and_update(
        {"_id": ObjectId(template_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template não encontrado"
        )
        
    return TemplateDocumentoResponse(**result)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: str, current_user: UsuarioDB = Depends(allow_staff)):
    """Exclui um template do sistema (Admins e Consultores)."""
    db = get_database()
    result = await db.templates_documentos.delete_one({"_id": ObjectId(template_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template não encontrado"
        )
    return None
