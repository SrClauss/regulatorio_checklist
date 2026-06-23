from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.database import get_database
from app.auth.dependencies import RoleChecker
from app.models.usuario import UsuarioDB

router = APIRouter(prefix="/api/previsibilidade", tags=["Dashboard de Previsibilidade"])

# Apenas administradores e consultores acessam o dashboard financeiro
allow_staff = RoleChecker(["admin", "consultor"])

@router.get("/mensal")
async def get_monthly_predictability(
    mes: int = Query(..., ge=1, le=12, description="Número do mês (1 a 12)"),
    ano: int = Query(..., ge=2026, le=2045, description="Ano da busca (ex: 2026)"),
    current_user: UsuarioDB = Depends(allow_staff)
):
    """Calcula a previsão de faturamento e lista as obrigações para um mês e ano específicos.
    Combina os valores de condicionantes e taxas de renovação de licenças daquele mês.
    """
    db = get_database()
    
    # Define o range de datas do mês solicitado
    start_date = datetime(ano, mes, 1, 0, 0, 0)
    if mes == 12:
        end_date = datetime(ano + 1, 1, 1, 0, 0, 0)
    else:
        end_date = datetime(ano, mes + 1, 1, 0, 0, 0)
        
    # Restrição de visibilidade para consultores: eles só veem faturamento das suas próprias empresas
    filtro_escopo_empresa = {}
    if current_user.role == "consultor":
        # Pega as empresas sob responsabilidade do consultor
        empresas_cursor = db.empresas.find({"responsavel_principal_id": current_user.id})
        empresas = await empresas_cursor.to_list(length=1000)
        empresa_ids = [e["_id"] for e in empresas]
        filtro_escopo_empresa = {"empresa_id": {"$in": empresa_ids}}
        
    # --- 1. Agregação de Tarefas Condicionantes ---
    pipeline_tarefas = [
        {
            "$match": {
                "data_vencimento": {"$gte": start_date, "$lt": end_date},
                **filtro_escopo_empresa
            }
        },
        # Join com empresas para pegar o nome fantasia
        {
            "$lookup": {
                "from": "empresas",
                "localField": "empresa_id",
                "foreignField": "_id",
                "as": "empresa"
            }
        },
        {"$unwind": {"path": "$empresa", "preserveNullAndEmptyArrays": True}},
        # Join com usuários para pegar o nome do executor
        {
            "$lookup": {
                "from": "usuarios",
                "localField": "responsavel_id",
                "foreignField": "_id",
                "as": "responsavel"
            }
        },
        {"$unwind": {"path": "$responsavel", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "titulo": 1,
                "status": 1,
                "data_vencimento": 1,
                "valor_estimado": 1,
                "cliente_executa": 1,
                "empresa_nome": {"$ifNull": ["$empresa.nome_fantasia", "Empresa Excluída"]},
                "responsavel_nome": {"$ifNull": ["$responsavel.nome", "Sem responsável"]}
            }
        }
    ]
    
    tarefas = await db.tarefas.aggregate(pipeline_tarefas).to_list(length=2000)
    faturamento_condicionantes = sum(t.get("valor_estimado", 0.0) for t in tarefas)
    
    # --- 2. Agregação de Documentos expirando no mês (Renovações) ---
    pipeline_documentos = [
        {
            "$match": {
                "data_vencimento": {"$gte": start_date, "$lt": end_date},
                # Para documentos, se for consultor, ele só vê os dele
                **({"responsavel_renovacao_id": current_user.id} if current_user.role == "consultor" else {})
            }
        },
        {
            "$lookup": {
                "from": "empresas",
                "localField": "empresa_id",
                "foreignField": "_id",
                "as": "empresa"
            }
        },
        {"$unwind": {"path": "$empresa", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "tipo": 1,
                "orgao": 1,
                "data_vencimento": 1,
                "valor_renovacao": 1,
                "status": 1,
                "empresa_nome": {"$ifNull": ["$empresa.nome_fantasia", "Empresa Excluída"]}
            }
        }
    ]
    
    documentos = await db.documentos.aggregate(pipeline_documentos).to_list(length=1000)
    faturamento_renovacoes = sum(d.get("valor_renovacao", 0.0) for d in documentos)
    
    return {
        "mes": mes,
        "ano": ano,
        "faturamento_condicionantes": faturamento_condicionantes,
        "faturamento_renovacoes": faturamento_renovacoes,
        "faturamento_total": faturamento_condicionantes + faturamento_renovacoes,
        "quantidade_tarefas": len(tarefas),
        "quantidade_documentos": len(documentos),
        "detalhes": {
            "tarefas": tarefas,
            "documentos_renovacao": documentos
        }
    }

@router.get("/anual")
async def get_yearly_predictability(
    ano: int = Query(..., ge=2026, le=2045, description="Ano da busca (ex: 2026)"),
    current_user: UsuarioDB = Depends(allow_staff)
):
    """Retorna o consolidado financeiro mês a mês para o ano informado, alimentando o gráfico de linha de previsibilidade."""
    db = get_database()
    
    resumo_anual = []
    start_year = datetime(ano, 1, 1, 0, 0, 0)
    end_year = datetime(ano + 1, 1, 1, 0, 0, 0)

    filtro_tarefas = {"data_vencimento": {"$gte": start_year, "$lt": end_year}}
    filtro_docs = {"data_vencimento": {"$gte": start_year, "$lt": end_year}}

    if current_user.role == "consultor":
        empresas_cursor = db.empresas.find({"responsavel_principal_id": current_user.id})
        empresas = await empresas_cursor.to_list(length=1000)
        empresa_ids = [e["_id"] for e in empresas]
        filtro_tarefas["empresa_id"] = {"$in": empresa_ids}
        filtro_docs["responsavel_renovacao_id"] = current_user.id

    pipeline_tarefas = [
        {"$match": filtro_tarefas},
        {"$group": {"_id": {"$month": "$data_vencimento"}, "total": {"$sum": "$valor_estimado"}}}
    ]
    pipeline_docs = [
        {"$match": filtro_docs},
        {"$group": {"_id": {"$month": "$data_vencimento"}, "total": {"$sum": "$valor_renovacao"}}}
    ]

    tarefas_agrupadas = await db.tarefas.aggregate(pipeline_tarefas).to_list(length=12)
    docs_agrupados = await db.documentos.aggregate(pipeline_docs).to_list(length=12)

    tarefas_dict = {item["_id"]: item["total"] for item in tarefas_agrupadas}
    docs_dict = {item["_id"]: item["total"] for item in docs_agrupados}

    for mes in range(1, 13):
        valor_tarefas = tarefas_dict.get(mes, 0.0)
        valor_docs = docs_dict.get(mes, 0.0)
        
        resumo_anual.append({
            "mes": mes,
            "faturamento_condicionantes": valor_tarefas,
            "faturamento_renovacoes": valor_docs,
            "faturamento_total": valor_tarefas + valor_docs
        })
        
    return {
        "ano": ano,
        "consolidado_mensal": resumo_anual
    }
