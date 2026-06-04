import pytest
from datetime import datetime
from fastapi import status
from bson import ObjectId

@pytest.mark.asyncio
async def test_create_document_and_auto_generate_tasks(client, db, test_consultor, test_empresa, admin_headers):
    """Testa a geração automática em lote de condicionantes futuras ao cadastrar um documento com template.
    O teste cria um template de 12 meses, cadastra um documento e valida se as tarefas foram criadas de forma recorrente.
    """
    # 1. Cria um template no banco de teste
    template_data = {
        "segmento": "Farmácia",
        "nome_documento": "Licença Sanitária de Teste",
        "validade_meses_padrao": 12,
        "valor_renovacao_sugerido": 1000.0,
        "condicionantes_sugeridas": [
            # Uma condicionante Mensal executada pelo cliente (frequencia_meses = 1)
            {
                "titulo": "Limpeza Geral",
                "frequencia_meses": 1,
                "cliente_executa": True,
                "valor_sugerido": 100.0
            },
            # Uma condicionante única no vencimento (frequencia_meses = 0)
            {
                "titulo": "Renovação Anual de Laudo",
                "frequencia_meses": 0,
                "cliente_executa": False,
                "valor_sugerido": 800.0
            }
        ]
    }
    temp_inserted = await db.templates_documentos.insert_one(template_data)
    template_id = str(temp_inserted.inserted_id)
    
    # 2. Dados do documento regulatório a ser cadastrado (vigência de 12 meses)
    data_emissao = datetime(2026, 6, 1)
    data_vencimento = datetime(2027, 6, 1)
    
    doc_payload = {
        "empresa_id": str(test_empresa["_id"]),
        "tipo": "Licença Sanitária de Teste",
        "orgao": "VISA Campinas",
        "numero_processo": "992-B/2026",
        "data_emissao": data_emissao.isoformat(),
        "data_vencimento": data_vencimento.isoformat(),
        "status": "Ativo",
        "valor_renovacao": 1200.0,
        "responsavel_renovacao_id": str(test_consultor["_id"])
    }
    
    # 3. Dispara a rota passando o template_id na query
    response = await client.post(
        f"/api/documentos?template_id={template_id}", 
        json=doc_payload, 
        headers=admin_headers
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    doc_data = response.json()
    assert doc_data["numero_processo"] == "992-B/2026"
    doc_id = doc_data["_id"]
    
    # 4. Verifica as tarefas inseridas no MongoDB
    # Esperamos:
    # - 1 tarefa única no vencimento do documento (2027-06-01)
    # - 12 tarefas mensais (de 2026-07-01 até 2027-06-01)
    # Total de tarefas no banco = 13 tarefas
    tarefas_cursor = db.tarefas.find({"documento_id": ObjectId(doc_id)})
    tarefas = await tarefas_cursor.to_list(length=100)
    
    assert len(tarefas) == 13
    
    # Valida tarefas recorrentes mensais
    tarefas_mensais = [t for t in tarefas if t["titulo"] == "Limpeza Geral"]
    assert len(tarefas_mensais) == 12
    assert tarefas_mensais[0]["valor_estimado"] == 100.0
    assert tarefas_mensais[0]["cliente_executa"] is True
    
    # Valida se a primeira tarefa mensal vence no primeiro mês subsequente
    # 2026-06-01 + 1 mês = 2026-07-01
    datas_vencimento_mensais = sorted([t["data_vencimento"] for t in tarefas_mensais])
    assert datas_vencimento_mensais[0].month == 7
    assert datas_vencimento_mensais[0].year == 2026
    # E a última no décimo segundo mês
    assert datas_vencimento_mensais[-1].month == 6
    assert datas_vencimento_mensais[-1].year == 2027
    
    # Valida tarefa única no vencimento
    tarefas_unicas = [t for t in tarefas if t["titulo"] == "Renovação Anual de Laudo"]
    assert len(tarefas_unicas) == 1
    assert tarefas_unicas[0]["valor_estimado"] == 800.0
    assert tarefas_unicas[0]["data_vencimento"] == data_vencimento
    assert tarefas_unicas[0]["cliente_executa"] is False
    assert tarefas_unicas[0]["responsavel_id"] == test_consultor["_id"]
