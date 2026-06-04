import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import ENCODERS_BY_TYPE
from bson import ObjectId
from app.models.object_id import PyObjectId

# Registra os encoders para o MongoDB ObjectId globalmente no FastAPI
ENCODERS_BY_TYPE[ObjectId] = str
ENCODERS_BY_TYPE[PyObjectId] = str

from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, usuarios, empresas, templates, documentos, tarefas, previsibilidade, notificacoes

# Configura o ciclo de vida (lifespan) da aplicação para conexões MongoDB
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Conecta ao banco de dados e cria os índices
    await connect_to_mongo()
    print("Conectado ao MongoDB com sucesso e índices criados.")
    yield
    # Shutdown: Fecha as conexões abertas
    await close_mongo_connection()
    print("Conexão com o MongoDB encerrada.")

app = FastAPI(
    title="Sistema de Gestão Regulatória - API",
    description="Backend assíncrono em FastAPI para controle de licenças e condicionantes.",
    version="1.0.0",
    lifespan=lifespan
)

# Configuração do Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ajuste para a URL do frontend em produção se necessário
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Garante que a pasta de uploads exista
uploads_dir = "backend/uploads"
os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "comprovantes"), exist_ok=True)

# Serve arquivos estáticos enviados (ex: comprovantes em PDF)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

# Registro das rotas da API
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(empresas.router)
app.include_router(templates.router)
app.include_router(documentos.router)
app.include_router(tarefas.router)
app.include_router(previsibilidade.router)
app.include_router(notificacoes.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "nome": "API de Gestão Regulatória",
        "mensagem": "Utilize os endpoints documentados em /docs ou /redoc"
    }
