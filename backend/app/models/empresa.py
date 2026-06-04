from typing import Optional
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel, PyObjectId

class EmpresaBase(BaseModel):
    razao_social: str
    nome_fantasia: str
    cnpj: str = Field(..., description="CNPJ formatado ou apenas números")
    cidade: str
    uf: str = Field(..., max_length=2, description="Sigla do estado (ex: SP)")
    segmento: str = Field(..., description="Segmento de mercado, ex: Farmácia, Posto de Combustível")
    responsavel_principal_id: PyObjectId = Field(..., description="ID do consultor técnico responsável pela conta")
    ativo: bool = True

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    segmento: Optional[str] = None
    responsavel_principal_id: Optional[PyObjectId] = None
    ativo: Optional[bool] = None

class EmpresaResponse(MongoBaseModel, EmpresaBase):
    pass

class EmpresaDB(MongoBaseModel, EmpresaBase):
    pass
