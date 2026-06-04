from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from app.models.object_id import MongoBaseModel, PyObjectId

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    role: str = Field(default="consultor", description="Pode ser admin, consultor ou cliente")
    empresa_cliente_id: Optional[PyObjectId] = Field(default=None, description="Preenchido apenas se role for 'cliente'")
    telefone: Optional[str] = None
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6, description="Senha em texto puro para criação")

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    empresa_cliente_id: Optional[PyObjectId] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = None

class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

class UsuarioResponse(MongoBaseModel, UsuarioBase):
    criado_em: datetime = Field(default_factory=datetime.utcnow)

class UsuarioDB(MongoBaseModel, UsuarioBase):
    senha_hash: str
    criado_em: datetime = Field(default_factory=datetime.utcnow)
