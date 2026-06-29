import pytest
from fastapi import status
from bson import ObjectId

@pytest.mark.asyncio
async def test_create_prestador_success(client, admin_headers):
    """Testa se admin/consultor pode cadastrar prestador."""
    payload = {
        "nome": "Dedetizadora Alpha",
        "cnpj": "12.345.678/0001-00",
        "contato": "contato@alpha.com",
        "ativo": True
    }
    
    response = await client.post("/api/prestadores", json=payload, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["nome"] == "Dedetizadora Alpha"
    assert data["cnpj"] == "12.345.678/0001-00"

@pytest.mark.asyncio
async def test_create_prestador_unauthorized_for_client(client, cliente_headers):
    """Testa se clientes não conseguem cadastrar prestador."""
    payload = {
        "nome": "Dedetizadora Invasora",
        "cnpj": "99.999.999/0001-99",
        "ativo": True
    }
    
    response = await client.post("/api/prestadores", json=payload, headers=cliente_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_task_relation_with_prestador(client, admin_headers, db, test_empresa, test_consultor):
    """Testa a vinculação direta de Prestador na Tarefa (Condicionante)."""
    # 1. Cadastra Prestador
    provider = {
        "nome": "Dedetização Geral",
        "cnpj": "22.333.444/0001-55",
        "ativo": True
    }
    prov_res = await db.prestadores.insert_one(provider)
    prov_id = str(prov_res.inserted_id)
    
    # 2. Cria Tarefa
    task_dict = {
        "empresa_id": str(test_empresa["_id"]),
        "prestador_id": prov_id,
        "titulo": "Dedetização da Farmácia Matriz",
        "responsavel_id": str(test_consultor["_id"]),
        "data_vencimento": "2026-07-20T23:59:00",
        "periodicidade": "Mensal",
        "valor_estimado": 350.00
    }
    
    response = await client.post("/api/tarefas", json=task_dict, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["prestador_id"] == prov_id
    assert data["titulo"] == "Dedetização da Farmácia Matriz"
    
    # 3. Lista Tarefas filtrando por prestador_id
    list_res = await client.get(f"/api/tarefas?prestador_id={prov_id}", headers=admin_headers)
    assert list_res.status_code == status.HTTP_200_OK
    list_data = list_res.json()
    assert len(list_data) == 1
    assert list_data[0]["prestador_id"] == prov_id
