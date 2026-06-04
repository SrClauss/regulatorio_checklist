from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

def get_database():
    """Retorna a instância do banco de dados conectada."""
    if db.client is None:
        db.client = AsyncIOMotorClient(settings.MONGODB_URI)
    return db.client[settings.DB_NAME]

async def connect_to_mongo():
    """Estabelece a conexão com o MongoDB e cria os índices recomendados."""
    db.client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = db.client[settings.DB_NAME]
    
    # Criar índices importantes para buscas rápidas
    # Busca por CNPJ nas empresas (deve ser único)
    await database.empresas.create_index("cnpj", unique=True)
    
    # Busca por email nos usuários (deve ser único)
    await database.usuarios.create_index("email", unique=True)
    
    # Busca por datas de vencimento de tarefas para o dashboard
    await database.tarefas.create_index("data_vencimento")
    
    # Busca de tarefas vinculadas a empresas e documentos
    await database.tarefas.create_index([("empresa_id", 1), ("data_vencimento", 1)])
    await database.tarefas.create_index("documento_id")
    
    # Busca por vencimento de documentos
    await database.documentos.create_index("data_vencimento")
    await database.documentos.create_index("empresa_id")

async def close_mongo_connection():
    """Fecha o pool de conexões com o MongoDB."""
    if db.client:
        db.client.close()
