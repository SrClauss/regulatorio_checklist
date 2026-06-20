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
async def test_create_classe_servico_success(client, admin_headers, db):
    """Testa cadastro de ClasseServico vinculado a um Prestador."""
    # 1. Cadastra Prestador
    provider = {
        "nome": "Laboratório de Análises Biológicas Ltda",
        "cnpj": "11.222.333/0001-44",
        "ativo": True
    }
    prov_res = await db.prestadores.insert_one(provider)
    prov_id = str(prov_res.inserted_id)
    
    # 2. Cadastra Classe de Serviço referenciando o Prestador
    payload = {
        "nome": "Análise de Potabilidade de Água",
        "descricao": "Análise físico-química e bacteriológica semestral",
        "prestador_id": prov_id,
        "ativo": True
    }
    
    response = await client.post("/api/classe-servicos", json=payload, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["nome"] == "Análise de Potabilidade de Água"
    assert data["prestador_id"] == prov_id

@pytest.mark.asyncio
async def test_task_relation_with_classe_servico(client, admin_headers, db, test_empresa, test_consultor):
    """Testa a vinculação de ClasseServico na Tarefa (Condicionante)."""
    # 1. Cadastra Classe de Serviço
    cs_dict = {
        "nome": "Dedetização Geral",
        "descricao": "Controle de pragas",
        "prestador_id": None,
        "ativo": True
    }
    cs_res = await db.classe_servicos.insert_one(cs_dict)
    cs_id = str(cs_res.inserted_id)
    
    # 2. Cria Tarefa
    task_dict = {
        "empresa_id": str(test_empresa["_id"]),
        "classe_servico_id": cs_id,
        "titulo": "Dedetização da Farmácia Matriz",
        "responsavel_id": str(test_consultor["_id"]),
        "data_vencimento": "2026-07-20T23:59:00",
        "periodicidade": "Mensal",
        "valor_estimado": 350.00
    }
    
    response = await client.post("/api/tarefas", json=task_dict, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["classe_servico_id"] == cs_id
    assert data["titulo"] == "Dedetização da Farmácia Matriz"
    
    # 3. Lista Tarefas filtrando por classe_servico_id
    list_res = await client.get(f"/api/tarefas?classe_servico_id={cs_id}", headers=admin_headers)
    assert list_res.status_code == status.HTTP_200_OK
    list_data = list_res.json()
    assert len(list_data) == 1
    assert list_data[0]["classe_servico_id"] == cs_id
