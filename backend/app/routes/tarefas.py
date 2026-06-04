import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from bson import ObjectId
from app.database import get_database
from app.models.tarefa import TarefaCreate, TarefaResponse, TarefaUpdate, TarefaDB, HistoricoObservacao
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/tarefas", tags=["Tarefas Condicionantes"])

allow_staff = RoleChecker(["admin", "consultor"])

# Pasta local para armazenar os comprovantes
UPLOAD_DIR = "backend/uploads/comprovantes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("", response_model=TarefaResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_task(task_in: TarefaCreate, current_user: UsuarioDB = Depends(RoleChecker(["admin"]))):
    """Cria uma tarefa/condicionante avulsa no sistema (Admins e Consultores)."""
    db = get_database()
    
    task_db = TarefaDB(**task_in.model_dump(by_alias=True))
    result = await db.tarefas.insert_one(task_db.model_dump(by_alias=True, exclude={"id"}))
    task_dict = await db.tarefas.find_one({"_id": result.inserted_id})
    return TarefaResponse(**task_dict)

@router.get("", response_model=List[TarefaResponse])
async def list_tasks(
    empresa_id: Optional[str] = Query(None),
    documento_id: Optional[str] = Query(None),
    responsavel_id: Optional[str] = Query(None),
    status_filtro: Optional[str] = Query(None, alias="status"),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Lista tarefas aplicando filtros e limites de visualização por nível de acesso (RBAC)."""
    db = get_database()
    
    query = {}
    
    # 1. Regras de Acesso por Role (Escopo de segurança)
    if current_user.role == "cliente":
        # Clientes só veem tarefas de sua empresa
        query["empresa_id"] = current_user.empresa_cliente_id
    elif current_user.role == "consultor":
        # Consultores só veem tarefas delegadas a eles mesmos
        query["responsavel_id"] = current_user.id
            
    # 2. Filtros Dinâmicos
    if empresa_id and current_user.role != "cliente":
        query["empresa_id"] = ObjectId(empresa_id)
    if documento_id:
        query["documento_id"] = ObjectId(documento_id)
    if responsavel_id and current_user.role != "cliente":
        query["responsavel_id"] = ObjectId(responsavel_id)
    if status_filtro:
        query["status"] = status_filtro
        
    # Filtro de datas (range)
    if data_inicio or data_fim:
        date_query = {}
        if data_inicio:
            date_query["$gte"] = data_inicio
        if data_fim:
            date_query["$lte"] = data_fim
        query["data_vencimento"] = date_query
        
    tasks_cursor = db.tarefas.find(query).sort("data_vencimento", 1)
    tasks = await tasks_cursor.to_list(length=2000)
    return [TarefaResponse(**t) for t in tasks]

@router.get("/{tarefa_id}", response_model=TarefaResponse)
async def get_task_by_id(tarefa_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de uma tarefa específica."""
    db = get_database()
    
    task_dict = await db.tarefas.find_one({"_id": ObjectId(tarefa_id)})
    if not task_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada"
        )
        
    task = TarefaDB(**task_dict)
    
    # Restrição de Cliente
    if current_user.role == "cliente" and task.empresa_id != current_user.empresa_cliente_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para esta tarefa"
        )
        
    return TarefaResponse(**task_dict)

@router.put("/{tarefa_id}", response_model=TarefaResponse)
async def update_task(
    tarefa_id: str, 
    task_in: TarefaUpdate, 
    observacao: Optional[str] = Query(None, description="Observação textual a ser adicionada ao histórico de alterações"),
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Atualiza dados e status de uma tarefa. Se o status passar para Concluído,
    registra automaticamente o carimbo de data_conclusao.
    """
    db = get_database()
    
    existing_task = await db.tarefas.find_one({"_id": ObjectId(tarefa_id)})
    if not existing_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada"
        )
        
    task = TarefaDB(**existing_task)
    
    # Validações de permissão
    if current_user.role == "cliente":
        if task.empresa_id != current_user.empresa_cliente_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para alterar esta tarefa"
            )
        # Clientes só podem editar tarefas marcadas como executadas por eles
        if not task.cliente_executa:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta tarefa é de responsabilidade técnica da consultoria"
            )
            
    update_data = task_in.model_dump(exclude_unset=True)
    
    # Tratamento automático de Conclusão
    if update_data.get("status") == "Concluído" and task.status != "Concluído":
        update_data["data_conclusao"] = datetime.utcnow()
    elif update_data.get("status") == "Pendente":
        update_data["data_conclusao"] = None
        
    # Gera logs automáticos de auditoria de alterações
    historico = task.historico_observacoes
    logs_auditoria = []
    
    # 1. Auditoria de Status
    if "status" in update_data and update_data["status"] != task.status:
        logs_auditoria.append(f"Status alterado de '{task.status}' para '{update_data['status']}'.")
        
    # 2. Auditoria de Responsável
    if "responsavel_id" in update_data and update_data["responsavel_id"] != task.responsavel_id:
        logs_auditoria.append(f"Responsável alterado de '{task.responsavel_id}' para '{update_data['responsavel_id']}'.")
        
    # 3. Auditoria de Data de Vencimento
    if "data_vencimento" in update_data and update_data["data_vencimento"] != task.data_vencimento:
        old_date = task.data_vencimento.strftime("%d/%m/%Y")
        new_date = update_data["data_vencimento"].strftime("%d/%m/%Y")
        logs_auditoria.append(f"Data de vencimento alterada de '{old_date}' para '{new_date}'.")

    # Insere as observações automáticas no histórico
    for log in logs_auditoria:
        historico.append(HistoricoObservacao(
            usuario_id=current_user.id,
            texto=log
        ))
        
    # Adiciona observação textual opcional se fornecida pelo usuário
    if observacao:
        historico.append(HistoricoObservacao(
            usuario_id=current_user.id,
            texto=observacao
        ))
        
    update_data["historico_observacoes"] = [obs.model_dump(by_alias=True) for obs in historico]
        
    result = await db.tarefas.find_one_and_update(
        {"_id": ObjectId(tarefa_id)},
        {"$set": update_data},
        return_document=True
    )
    
    return TarefaResponse(**result)

@router.post("/{tarefa_id}/upload-comprovante", response_model=TarefaResponse)
async def upload_receipt(
    tarefa_id: str,
    file: UploadFile = File(...),
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Faz o upload do comprovante de conclusão (PDF/imagem) e associa à tarefa,
    alterando o status do checklist.
    """
    db = get_database()
    
    task_dict = await db.tarefas.find_one({"_id": ObjectId(tarefa_id)})
    if not task_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada"
        )
        
    task = TarefaDB(**task_dict)
    
    # Restrições de upload
    if current_user.role == "cliente" and task.empresa_id != current_user.empresa_cliente_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para esta tarefa"
        )
        
    # Salva o arquivo localmente
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"comprovante_{tarefa_id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    # Determina o novo status
    # Se o cliente enviou, vai para "Aguardando Auditoria" para a consultoria auditar
    # Se a própria consultoria enviou, vai direto para "Concluído"
    novo_status = "Aguardando Auditoria" if current_user.role == "cliente" else "Concluído"
    data_concl = datetime.utcnow() if current_user.role != "cliente" else None
    
    # Atualiza a tarefa no banco
    comprovante_url = f"/static/comprovantes/{safe_filename}"
    
    nova_obs = HistoricoObservacao(
        usuario_id=current_user.id,
        texto=f"Comprovante enviado: {file.filename}. Status alterado para {novo_status}."
    )
    historico = task.historico_observacoes
    historico.append(nova_obs)
    
    result = await db.tarefas.find_one_and_update(
        {"_id": ObjectId(tarefa_id)},
        {
            "$set": {
                "comprovante_url": comprovante_url,
                "status": novo_status,
                "data_conclusao": data_concl,
                "historico_observacoes": [obs.model_dump(by_alias=True) for obs in historico]
            }
        },
        return_document=True
    )
    
    return TarefaResponse(**result)
