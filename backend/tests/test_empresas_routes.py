import pytest
from fastapi import status
from bson import ObjectId

@pytest.mark.asyncio
async def test_create_company_success(client, admin_headers, test_consultor):
    """Testa se o admin/consultor consegue cadastrar uma empresa com sucesso."""
    payload = {
        "razao_social": "Nova Empresa SA",
        "nome_fantasia": "Nova Company",
        "cnpj": "12.345.678/0001-90",
        "cidade": "Valinhos",
        "uf": "SP",
        "segmento": "Farmácia",
        "responsavel_principal_id": str(test_consultor["_id"]),
        "ativo": True
    }
    
    response = await client.post("/api/empresas", json=payload, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["cnpj"] == "12.345.678/0001-90"
    assert data["nome_fantasia"] == "Nova Company"

@pytest.mark.asyncio
async def test_create_company_unauthorized_for_client(client, cliente_headers, test_consultor):
    """Testa se clientes são impedidos de cadastrar empresas."""
    payload = {
        "razao_social": "Cliente Criando SA",
        "nome_fantasia": "Cliente Criando",
        "cnpj": "12.345.678/0001-91",
        "cidade": "Valinhos",
        "uf": "SP",
        "segmento": "Farmácia",
        "responsavel_principal_id": str(test_consultor["_id"]),
        "ativo": True
    }
    
    response = await client.post("/api/empresas", json=payload, headers=cliente_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_list_companies_scope_boundaries(
    client, db, test_admin, test_consultor, test_cliente, test_empresa,
    admin_headers, consultor_headers, cliente_headers
):
    """Testa o isolamento de escopo na listagem de empresas:
    - Admin vê todas as empresas do banco.
    - Consultor vê apenas as suas empresas designadas.
    - Cliente vê apenas a empresa de sua associação.
    """
    # Cria uma segunda empresa vinculada a outro consultor fictício
    outra_empresa = {
        "razao_social": "Outra Empresa SA",
        "nome_fantasia": "Outra Company",
        "cnpj": "88.888.888/0001-88",
        "cidade": "São Paulo",
        "uf": "SP",
        "segmento": "Alimentos",
        "responsavel_principal_id": ObjectId(), # ID aleatório
        "ativo": True
    }
    await db.empresas.insert_one(outra_empresa)
    
    # 1. Admin busca todas (deve receber 2 empresas)
    res_admin = await client.get("/api/empresas", headers=admin_headers)
    assert res_admin.status_code == status.HTTP_200_OK
    assert len(res_admin.json()) == 2
    
    # 2. Consultor busca (deve receber apenas 1, a dele)
    res_cons = await client.get("/api/empresas", headers=consultor_headers)
    assert res_cons.status_code == status.HTTP_200_OK
    assert len(res_cons.json()) == 1
    assert res_cons.json()[0]["_id"] == str(test_empresa["_id"])
    
    # 3. Cliente busca (deve receber apenas 1, a sua)
    res_clie = await client.get("/api/empresas", headers=cliente_headers)
    assert res_clie.status_code == status.HTTP_200_OK
    assert len(res_clie.json()) == 1
    assert res_clie.json()[0]["_id"] == str(test_empresa["_id"])

@pytest.mark.asyncio
async def test_get_company_by_id_restricted(client, cliente_headers, test_empresa, db):
    """Testa se o cliente recebe erro 403 ao tentar ler empresa de outro cliente."""
    # Cria outra empresa no banco
    outra_empresa = {
        "razao_social": "Outra Empresa SA",
        "nome_fantasia": "Outra Company",
        "cnpj": "88.888.888/0001-88",
        "cidade": "São Paulo",
        "uf": "SP",
        "segmento": "Alimentos",
        "responsavel_principal_id": ObjectId(),
        "ativo": True
    }
    res_inserted = await db.empresas.insert_one(outra_empresa)
    outra_id = str(res_inserted.inserted_id)
    
    # Cliente tenta buscar empresa do outro
    response = await client.get(f"/api/empresas/{outra_id}", headers=cliente_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
