import pytest
from fastapi import status

@pytest.mark.asyncio
async def test_register_initial_admin_success(client, db):
    """Testa se o registro inicial de admin funciona quando o banco de usuários está vazio."""
    payload = {
        "nome": "Super Admin",
        "email": "super.admin@example.com",
        "role": "admin",
        "senha": "supersecretpassword",
        "ativo": True
    }
    
    response = await client.post("/api/auth/register-initial-admin", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "super.admin@example.com"
    assert data["role"] == "admin"
    assert "senha_hash" not in data  # Garante segurança de não vazar hash

@pytest.mark.asyncio
async def test_register_initial_admin_blocked(client, test_admin):
    """Testa se o registro inicial é bloqueado se já existirem usuários no sistema."""
    payload = {
        "nome": "Outro Admin",
        "email": "outro.admin@example.com",
        "role": "admin",
        "senha": "password123",
        "ativo": True
    }
    
    response = await client.post("/api/auth/register-initial-admin", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "O administrador inicial já foi criado. Cadastro normal deve ser feito por um administrador."

@pytest.mark.asyncio
async def test_login_success(client, test_admin):
    """Testa login bem-sucedido com credenciais corretas."""
    payload = {
        "email": "admin.test@example.com",
        "senha": "admin123"
    }
    
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin.test@example.com"

@pytest.mark.asyncio
async def test_login_wrong_credentials(client, test_admin):
    """Testa falha de login com senha ou e-mail incorretos."""
    # Senha incorreta
    response = await client.post("/api/auth/login", json={
        "email": "admin.test@example.com",
        "senha": "senha_incorreta"
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    # E-mail incorreto
    response = await client.post("/api/auth/login", json={
        "email": "nao_existe@example.com",
        "senha": "admin123"
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_read_users_me(client, admin_headers, test_admin):
    """Testa a leitura dos dados do perfil logado."""
    response = await client.get("/api/auth/me", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_admin["email"]
    assert data["nome"] == test_admin["nome"]

@pytest.mark.asyncio
async def test_read_users_me_unauthorized(client):
    """Testa se rota /me bloqueia acessos sem cabeçalho Authorization válido."""
    response = await client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
