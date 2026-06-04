import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.main import app
from app.database import db as app_db
from app.config import settings
from app.auth.security import get_password_hash, create_access_token

# Altera dinamicamente o nome do banco de dados para testes
TEST_DB_NAME = "claudio_test"
settings.DB_NAME = TEST_DB_NAME

@pytest_asyncio.fixture(scope="function")
async def test_db_client() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """Cria o cliente do MongoDB para gerenciar a criação e destruição do banco de testes para cada teste."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    yield client
    # Destrói o banco de dados de teste após o teste rodar
    await client.drop_database(TEST_DB_NAME)
    client.close()

@pytest_asyncio.fixture(scope="function")
async def db(test_db_client: AsyncIOMotorClient):
    """Limpa e retorna o banco de dados de teste para cada função de teste individual.
    Vincula o cliente de teste ao client global para resolver as chamadas de get_database.
    """
    # Vincula o client global da aplicação ao client do teste atual
    app_db.client = test_db_client
    
    database = test_db_client[TEST_DB_NAME]
    
    # Limpa dados de coleções anteriores para garantir isolamento
    collections = await database.list_collection_names()
    for col in collections:
        if not col.startswith("system."):
            await database[col].delete_many({})
            
    # Cria os índices recomendados
    await database.empresas.create_index("cnpj", unique=True)
    await database.usuarios.create_index("email", unique=True)
    await database.tarefas.create_index("data_vencimento")
    
    yield database
    
    # Limpa a referência do client
    app_db.client = None

@pytest_asyncio.fixture(scope="function")
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    """Cria o cliente HTTP assíncrono para o FastAPI."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
        
# --- Fixtures de Seed de Usuários ---

@pytest_asyncio.fixture(scope="function")
async def test_admin(db) -> dict:
    """Cria e retorna um usuário administrador de teste no banco."""
    hashed_password = get_password_hash("admin123")
    user_data = {
        "nome": "Admin Teste",
        "email": "admin.test@example.com",
        "role": "admin",
        "ativo": True,
        "senha_hash": hashed_password
    }
    result = await db.usuarios.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return user_data

@pytest_asyncio.fixture(scope="function")
async def test_consultor(db) -> dict:
    """Cria e retorna um usuário consultor de teste no banco."""
    hashed_password = get_password_hash("consultor123")
    user_data = {
        "nome": "Consultor Teste",
        "email": "consultor.test@example.com",
        "role": "consultor",
        "ativo": True,
        "senha_hash": hashed_password
    }
    result = await db.usuarios.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return user_data

@pytest_asyncio.fixture(scope="function")
async def test_empresa(db, test_consultor) -> dict:
    """Cria uma empresa vinculada ao consultor de teste."""
    company_data = {
        "razao_social": "Test Ltda",
        "nome_fantasia": "Test Company",
        "cnpj": "99.888.777/0001-99",
        "cidade": "Campinas",
        "uf": "SP",
        "segmento": "Alimentos",
        "responsavel_principal_id": test_consultor["_id"],
        "ativo": True
    }
    result = await db.empresas.insert_one(company_data)
    company_data["_id"] = result.inserted_id
    return company_data

@pytest_asyncio.fixture(scope="function")
async def test_cliente(db, test_empresa) -> dict:
    """Cria e retorna um usuário cliente vinculado à empresa de teste."""
    hashed_password = get_password_hash("cliente123")
    user_data = {
        "nome": "Cliente Teste",
        "email": "cliente.test@example.com",
        "role": "cliente",
        "empresa_cliente_id": test_empresa["_id"],
        "ativo": True,
        "senha_hash": hashed_password
    }
    result = await db.usuarios.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return user_data

# --- Fixtures de Tokens e Headers (síncronas pois recebem valores resolvidos pelo pytest-asyncio) ---

@pytest.fixture
def admin_headers(test_admin) -> dict:
    token = create_access_token(subject=test_admin["_id"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def consultor_headers(test_consultor) -> dict:
    token = create_access_token(subject=test_consultor["_id"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def cliente_headers(test_cliente) -> dict:
    token = create_access_token(subject=test_cliente["_id"])
    return {"Authorization": f"Bearer {token}"}
