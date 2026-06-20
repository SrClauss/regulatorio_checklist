from typing import Optional
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel, PyObjectId

class PrestadorBase(BaseModel):
    nome: str = Field(..., description="Nome do prestador de serviço")
    cnpj: Optional[str] = Field(default=None, description="CNPJ do prestador")
    contato: Optional[str] = Field(default=None, description="Telefone ou e-mail de contato")
    ativo: bool = Field(default=True, description="Indica se o prestador está ativo")

class PrestadorCreate(PrestadorBase):
    pass

class PrestadorUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    ativo: Optional[bool] = None

class PrestadorResponse(MongoBaseModel, PrestadorBase):
    pass

class PrestadorDB(MongoBaseModel, PrestadorBase):
    pass
