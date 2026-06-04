import pytest
from datetime import datetime
from fastapi import status

@pytest.mark.asyncio
async def test_monthly_predictability_calculations(client, db, test_empresa, test_consultor, admin_headers):
    """Testa se os cálculos de previsibilidade mensal de faturamento estão corretos
    para condicionantes e renovações de documentos.
    """
    # 1. Cria tarefas no banco de dados para Junho/2026
    # Faturamento de tarefas em Junho = 500 + 300 = 800
    tarefas_junho = [
        {
            "empresa_id": test_empresa["_id"],
            "titulo": "Tarefa de Junho 1",
            "status": "Pendente",
            "cliente_executa": False,
            "responsavel_id": test_consultor["_id"],
            "data_vencimento": datetime(2026, 6, 15),
            "valor_estimado": 500.0,
            "historico_observacoes": []
        },
        {
            "empresa_id": test_empresa["_id"],
            "titulo": "Tarefa de Junho 2",
            "status": "Pendente",
            "cliente_executa": False,
            "responsavel_id": test_consultor["_id"],
            "data_vencimento": datetime(2026, 6, 28),
            "valor_estimado": 300.0,
            "historico_observacoes": []
        },
        # Tarefa fora do mês (Julho/2026) - Não deve ser somada
        {
            "empresa_id": test_empresa["_id"],
            "titulo": "Tarefa de Julho",
            "status": "Pendente",
            "cliente_executa": False,
            "responsavel_id": test_consultor["_id"],
            "data_vencimento": datetime(2026, 7, 10),
            "valor_estimado": 1000.0,
            "historico_observacoes": []
        }
    ]
    await db.tarefas.insert_many(tarefas_junho)
    
    # 2. Cria documentos expirando em Junho/2026 (Renovação)
    # Faturamento de renovação em Junho = 1500
    documentos_junho = [
        {
            "empresa_id": test_empresa["_id"],
            "tipo": "Alvará de Junho",
            "orgao": "Prefeitura",
            "data_emissao": datetime(2025, 6, 1),
            "data_vencimento": datetime(2026, 6, 20),
            "status": "Ativo",
            "valor_renovacao": 1500.0,
            "responsavel_renovacao_id": test_consultor["_id"]
        },
        # Documento expirando em Julho - Não deve ser somado
        {
            "empresa_id": test_empresa["_id"],
            "tipo": "Alvará de Julho",
            "orgao": "Prefeitura",
            "data_emissao": datetime(2025, 7, 1),
            "data_vencimento": datetime(2026, 7, 20),
            "status": "Ativo",
            "valor_renovacao": 2500.0,
            "responsavel_renovacao_id": test_consultor["_id"]
        }
    ]
    await db.documentos.insert_many(documentos_junho)
    
    # 3. Chama a rota de previsibilidade para Junho/2026
    response = await client.get("/api/previsibilidade/mensal?mes=6&ano=2026", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["mes"] == 6
    assert data["ano"] == 2026
    
    # Valida somas financeiras
    assert data["faturamento_condicionantes"] == 800.0
    assert data["faturamento_renovacoes"] == 1500.0
    assert data["faturamento_total"] == 2300.0
    
    # Valida as listagens de detalhes de obrigações
    assert data["quantidade_tarefas"] == 2
    assert data["quantidade_documentos"] == 1
    assert data["detalhes"]["tarefas"][0]["titulo"] in ["Tarefa de Junho 1", "Tarefa de Junho 2"]
    assert data["detalhes"]["documentos_renovacao"][0]["tipo"] == "Alvará de Junho"

@pytest.mark.asyncio
async def test_yearly_predictability_chart_data(client, db, test_empresa, test_consultor, admin_headers):
    """Testa se a agregação anual retorna o array consolidado com dados para os 12 meses."""
    # Adiciona uma tarefa em Novembro de 2026
    tarefa = {
        "empresa_id": test_empresa["_id"],
        "titulo": "Tarefa de Novembro",
        "status": "Pendente",
        "cliente_executa": False,
        "responsavel_id": test_consultor["_id"],
        "data_vencimento": datetime(2026, 11, 5),
        "valor_estimado": 950.0,
        "historico_observacoes": []
    }
    await db.tarefas.insert_one(tarefa)
    
    response = await client.get("/api/previsibilidade/anual?ano=2026", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["ano"] == 2026
    
    consolidado = data["consolidado_mensal"]
    assert len(consolidado) == 12
    
    # Novembro é o mês 11 (índice 10 no array de 0 a 11)
    novembro_data = next(item for item in consolidado if item["mes"] == 11)
    assert novembro_data["faturamento_condicionantes"] == 950.0
    assert novembro_data["faturamento_total"] == 950.0
    
    # Janeiro de 2026 (índice 0) deve ser 0.0
    janeiro_data = next(item for item in consolidado if item["mes"] == 1)
    assert janeiro_data["faturamento_total"] == 0.0
