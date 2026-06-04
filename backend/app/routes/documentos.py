from typing import List, Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta # Nota: adicionaremos no requirements.txt se necessário, ou faremos cálculo de meses simples nativo
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.database import get_database
from app.models.documento import DocumentoCreate, DocumentoResponse, DocumentoUpdate, DocumentoDB
from app.models.tarefa import TarefaDB, HistoricoObservacao
from app.auth.dependencies import RoleChecker, get_current_active_user
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/documentos", tags=["Documentos Regulatórios"])

allow_staff = RoleChecker(["admin"])

def add_months(sourcedate: datetime, months: int) -> datetime:
    """Função auxiliar nativa para adicionar meses a uma data sem depender de bibliotecas externas."""
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, [31,
        29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return datetime(year, month, day, sourcedate.hour, sourcedate.minute, sourcedate.second)

@router.post("", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentoCreate, 
    template_id: Optional[str] = Query(None, description="ID do template para gerar condicionantes futuras automaticamente"),
    current_user: UsuarioDB = Depends(allow_staff)
):
    """Cadastra um novo documento regulatório. Se fornecido um template_id,
    o sistema gera e programa em lote todas as condicionantes futuras associadas até a data de vencimento da licença.
    """
    db = get_database()
    
    # 1. Salva o documento no banco
    doc_db = DocumentoDB(**doc_in.model_dump(by_alias=True))
    result = await db.documentos.insert_one(doc_db.model_dump(by_alias=True, exclude={"id"}))
    doc_id = result.inserted_id
    
    # 2. Se um template_id foi passado, gera as condicionantes em lote
    if template_id:
        template = await db.templates_documentos.find_one({"_id": ObjectId(template_id)})
        if template:
            tarefas_lote = []
            data_emissao = doc_in.data_emissao
            data_vencimento = doc_in.data_vencimento
            
            # Encontra o usuário responsável padrão da empresa ou o próprio consultor
            empresa = await db.empresas.find_one({"_id": ObjectId(doc_in.empresa_id)})
            responsavel_consultoria_id = empresa.get("responsavel_principal_id") if empresa else current_user.id
            
            # Tenta encontrar um usuário do tipo cliente para essa empresa se houver
            responsavel_cliente_id = None
            if empresa:
                cliente_user = await db.usuarios.find_one({"empresa_cliente_id": empresa["_id"], "role": "cliente"})
                if cliente_user:
                    responsavel_cliente_id = cliente_user["_id"]
            
            for cond in template.get("condicionantes_sugeridas", []):
                freq = cond.get("frequencia_meses", 0)
                
                # Se for tarefa única (frequência 0)
                periodicidade = "Mensal" if freq == 1 else "Outra"
                if freq == 0:
                    nova_tarefa = TarefaDB(
                        documento_id=ObjectId(doc_id),
                        empresa_id=ObjectId(doc_in.empresa_id),
                        titulo=cond.get("titulo"),
                        descricao=f"Condicionante única vinculada ao documento {doc_in.tipo}",
                        tipo_id="checklist_interno",
                        cliente_executa=cond.get("cliente_executa", False),
                        status="Pendente",
                        responsavel_id=responsavel_cliente_id if cond.get("cliente_executa") and responsavel_cliente_id else responsavel_consultoria_id,
                        data_vencimento=data_vencimento,
                        valor_estimado=cond.get("valor_sugerido", 0.0),
                        periodicidade=periodicidade,
                        historico_observacoes=[
                            HistoricoObservacao(
                                usuario_id=current_user.id,
                                texto="Criado automaticamente via ativação de template."
                            )
                        ]
                    )
                    tarefas_lote.append(nova_tarefa.model_dump(by_alias=True, exclude={"id"}))
                
                # Se for recorrente (ex: mensal, trimestral, etc.)
                elif freq > 0:
                    data_corrente = add_months(data_emissao, freq)
                    # Loop programando até a validade da licença (máximo de 15 anos para segurança de buffer)
                    limite_15_anos = data_emissao + relativedelta(years=15) if 'relativedelta' in globals() else data_emissao.replace(year=data_emissao.year + 15)
                    
                    while data_corrente <= data_vencimento and data_corrente <= limite_15_anos:
                        nova_tarefa = TarefaDB(
                            documento_id=ObjectId(doc_id),
                            empresa_id=ObjectId(doc_in.empresa_id),
                            titulo=cond.get("titulo"),
                            descricao=f"Condicionante periódica vinculada ao documento {doc_in.tipo}",
                            tipo_id="checklist_interno",
                            cliente_executa=cond.get("cliente_executa", False),
                            status="Pendente",
                            responsavel_id=responsavel_cliente_id if cond.get("cliente_executa") and responsavel_cliente_id else responsavel_consultoria_id,
                            data_vencimento=data_corrente,
                            valor_estimado=cond.get("valor_sugerido", 0.0),
                            periodicidade=periodicidade,
                            historico_observacoes=[
                                HistoricoObservacao(
                                    usuario_id=current_user.id,
                                    texto=f"Criada automaticamente programada para {data_corrente.strftime('%d/%m/%Y')}."
                                )
                            ]
                        )
                        tarefas_lote.append(nova_tarefa.model_dump(by_alias=True, exclude={"id"}))
                        data_corrente = add_months(data_corrente, freq)
            
            # Insere as tarefas no banco
            if tarefas_lote:
                await db.tarefas.insert_many(tarefas_lote)
                
    doc_dict = await db.documentos.find_one({"_id": doc_id})
    return DocumentoResponse(**doc_dict)

@router.get("", response_model=List[DocumentoResponse])
async def list_documents(
    empresa_id: Optional[str] = Query(None, description="Filtra por empresa específica"),
    current_user: UsuarioDB = Depends(get_current_active_user)
):
    """Lista todos os documentos regulatórios ativos. Aplica segurança de escopo por papel (RBAC)."""
    db = get_database()
    
    query = {}
    
    # Se for cliente, vê apenas documentos de sua empresa
    if current_user.role == "cliente":
        query["empresa_id"] = current_user.empresa_cliente_id
    elif empresa_id:
        query["empresa_id"] = ObjectId(empresa_id)
        
    documents_cursor = db.documentos.find(query)
    documents = await documents_cursor.to_list(length=1000)
    return [DocumentoResponse(**d) for d in documents]

@router.get("/{documento_id}", response_model=DocumentoResponse)
async def get_document_by_id(documento_id: str, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Obtém detalhes de um documento regulatório específico."""
    db = get_database()
    
    doc_dict = await db.documentos.find_one({"_id": ObjectId(documento_id)})
    if not doc_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
        
    doc = DocumentoDB(**doc_dict)
    
    # Valida restrições de cliente
    if current_user.role == "cliente" and doc.empresa_id != current_user.empresa_cliente_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para este documento"
        )
        
    return DocumentoResponse(**doc_dict)

@router.put("/{documento_id}", response_model=DocumentoResponse)
async def update_document(documento_id: str, doc_in: DocumentoUpdate, current_user: UsuarioDB = Depends(allow_staff)):
    """Atualiza dados do documento regulatório (Admins e Consultores)."""
    db = get_database()
    
    update_data = doc_in.model_dump(exclude_unset=True)
    if not update_data:
        doc_dict = await db.documentos.find_one({"_id": ObjectId(documento_id)})
        return DocumentoResponse(**doc_dict)
        
    result = await db.documentos.find_one_and_update(
        {"_id": ObjectId(documento_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
        
    return DocumentoResponse(**result)

@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(documento_id: str, current_user: UsuarioDB = Depends(allow_staff)):
    """Remove um documento do sistema e exclui suas tarefas condicionantes pendentes."""
    db = get_database()
    
    # 1. Remove as tarefas pendentes vinculadas ao documento
    await db.tarefas.delete_many({"documento_id": ObjectId(documento_id), "status": {"$in": ["Pendente", "Em Andamento"]}})
    
    # 2. Deleta o documento principal
    result = await db.documentos.delete_one({"_id": ObjectId(documento_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    return None
