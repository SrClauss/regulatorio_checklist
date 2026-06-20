from typing import Optional
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel, PyObjectId

class ClasseServicoBase(BaseModel):
    nome: str = Field(..., description="Nome da classe de serviço, ex: Dedetização")
    descricao: Optional[str] = Field(default=None, description="Descrição do serviço")
    prestador_id: Optional[PyObjectId] = Field(default=None, description="Prestador de serviço atual associado")
    ativo: bool = Field(default=True, description="Indica se a classe de serviço está ativa")

class ClasseServicoCreate(ClasseServicoBase):
    pass

class ClasseServicoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    prestador_id: Optional[PyObjectId] = None
    ativo: Optional[bool] = None

class ClasseServicoResponse(MongoBaseModel, ClasseServicoBase):
    pass

class ClasseServicoDB(MongoBaseModel, ClasseServicoBase):
    pass
