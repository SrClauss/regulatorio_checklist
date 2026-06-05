import os
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from bson import ObjectId
from app.database import get_database
from app.models.tarefa import TarefaCreate, TarefaResponse, TarefaUpdate, TarefaDB, HistoricoObservacao
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB
from app.utils.push import send_push_notification
from app.utils.minio_client import upload_to_minio, get_from_minio

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
            texto=log,
            autor=current_user.nome
        ))
        
    # Adiciona observação textual opcional se fornecida pelo usuário
    if observacao:
        historico.append(HistoricoObservacao(
            usuario_id=current_user.id,
            texto=observacao,
            autor=current_user.nome
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
    alterando o status do checklist. Armazena no MinIO, caindo de volta para o
    armazenamento local se o MinIO estiver indisponível.
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
        
    # Salva o arquivo localmente ou no MinIO
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"comprovante_{tarefa_id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    
    content = await file.read()
    file_data = io.BytesIO(content)
    length = len(content)
    content_type = file.content_type or "application/octet-stream"
    
    # Upload no MinIO
    uploaded_to_minio = upload_to_minio(safe_filename, file_data, length, content_type)
    
    comprovante_key = None
    if uploaded_to_minio:
        comprovante_url = f"/api/tarefas/{tarefa_id}/download"
        comprovante_key = safe_filename
    else:
        # Fallback local
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        comprovante_url = f"/static/comprovantes/{safe_filename}"
        
    # Determina o novo status
    # Se o cliente enviou, vai para "Aguardando Auditoria" para a consultoria auditar
    # Se a própria consultoria enviou, vai direto para "Concluído"
    novo_status = "Aguardando Auditoria" if current_user.role == "cliente" else "Concluído"
    data_concl = datetime.utcnow() if current_user.role != "cliente" else None
    
    nova_obs = HistoricoObservacao(
        usuario_id=current_user.id,
        texto=f"Comprovante enviado: {file.filename}. Status alterado para {novo_status}.",
        autor=current_user.nome
    )
    historico = task.historico_observacoes
    historico.append(nova_obs)
    
    result = await db.tarefas.find_one_and_update(
        {"_id": ObjectId(tarefa_id)},
        {
            "$set": {
                "comprovante_url": comprovante_url,
                "comprovante_key": comprovante_key,
                "status": novo_status,
                "data_conclusao": data_concl,
                "historico_observacoes": [obs.model_dump(by_alias=True) for obs in historico]
            }
        },
        return_document=True
    )
    
    return TarefaResponse(**result)


@router.get("/{tarefa_id}/download")
async def download_receipt(
    tarefa_id: str,
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Retorna o comprovante/evidência da tarefa. Se o comprovante estiver armazenado no MinIO,
    faz o streaming dele. Se for local, retorna o FileResponse local.
    """
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
        
    if not task.comprovante_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum comprovante enviado para esta tarefa"
        )
        
    # Se está no MinIO (comprovante_key está definido)
    if task.comprovante_key:
        response = get_from_minio(task.comprovante_key)
        if response:
            headers = {
                "Content-Disposition": f"attachment; filename={task.comprovante_key}"
            }
            # Stream the file from MinIO response
            return StreamingResponse(
                io.BytesIO(response.read()),
                media_type="application/octet-stream",
                headers=headers
            )
            
    # Fallback para local
    if "/static/comprovantes/" in task.comprovante_url:
        filename = task.comprovante_url.split("/static/comprovantes/")[1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path)
            
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Arquivo do comprovante não encontrado"
    )


@router.post("/{tarefa_id}/notificar", response_model=TarefaResponse)
async def notify_task_responsible(
    tarefa_id: str,
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Envia uma notificação push para o responsável pela condicionante e registra no histórico de observações."""
    db = get_database()
    
    task_dict = await db.tarefas.find_one({"_id": ObjectId(tarefa_id)})
    if not task_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada"
        )
        
    task = TarefaDB(**task_dict)
    
    # 1. Obter o responsável
    responsavel = await db.usuarios.find_one({"_id": task.responsavel_id})
    if not responsavel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário responsável não encontrado"
        )
        
    # 2. Buscar inscrições de push do responsável
    inscricoes_cursor = db.inscricoes_push.find({"usuario_id": task.responsavel_id})
    inscricoes = await inscricoes_cursor.to_list(length=100)
    
    sucessos = 0
    erros_limpar = []
    
    # Corpo da notificação
    title = f"Cobrança: {task.titulo}"
    body = f"Olá {responsavel.get('nome', 'Responsável')}! Uma notificação foi enviada sobre a condicionante pendente '{task.titulo}'."
    url = "/checklist"
    
    if inscricoes:
        for ins in inscricoes:
            try:
                ok = send_push_notification(
                    subscription=ins["subscription"],
                    title=title,
                    body=body,
                    url=url
                )
                if ok:
                    sucessos += 1
            except HTTPException as ex:
                if ex.status_code == 410:
                    erros_limpar.append(ins["_id"])
                    
        # Limpa inscrições inválidas
        if erros_limpar:
            await db.inscricoes_push.delete_many({"_id": {"$in": erros_limpar}})
            
    # 3. Adicionar registro no histórico de observações (Rastreabilidade)
    status_msg = f" com sucesso ({sucessos} dispositivos)" if sucessos > 0 else " (nenhum dispositivo cadastrado)"
    log_texto = f"Notificação de cobrança enviada ao responsável {responsavel.get('nome')} por {current_user.nome}{status_msg}."
    
    historico = task.historico_observacoes
    historico.append(HistoricoObservacao(
        usuario_id=current_user.id,
        texto=log_texto,
        autor=current_user.nome
    ))
    
    result = await db.tarefas.find_one_and_update(
        {"_id": ObjectId(tarefa_id)},
        {"$set": {"historico_observacoes": [obs.model_dump(by_alias=True) for obs in historico]}},
        return_document=True
    )
    
    return TarefaResponse(**result)


@router.post("/{tarefa_id}/observacao", response_model=TarefaResponse)
async def add_task_observation(
    tarefa_id: str,
    texto: str = Query(..., min_length=1, description="Texto da observação/mensagem"),
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Adiciona uma observação/comunicação de texto no histórico da tarefa, permitindo
    a comunicação entre o cliente (empresa) e o prestador (consultoria).
    """
    db = get_database()
    
    task_dict = await db.tarefas.find_one({"_id": ObjectId(tarefa_id)})
    if not task_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarefa não encontrada"
        )
        
    task = TarefaDB(**task_dict)
    
    # Validações de permissão: Clientes só podem comentar em tarefas de sua própria empresa
    if current_user.role == "cliente" and task.empresa_id != current_user.empresa_cliente_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para comentar nesta tarefa"
        )
        
    # Adiciona a mensagem ao histórico de observações
    nova_obs = HistoricoObservacao(
        usuario_id=current_user.id,
        texto=texto,
        autor=current_user.nome
    )
    historico = task.historico_observacoes
    historico.append(nova_obs)
    
    result = await db.tarefas.find_one_and_update(
        {"_id": ObjectId(tarefa_id)},
        {"$set": {"historico_observacoes": [obs.model_dump(by_alias=True) for obs in historico]}},
        return_document=True
    )
    
    return TarefaResponse(**result)
