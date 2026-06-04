from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel, PyObjectId

class DocumentoBase(BaseModel):
    empresa_id: PyObjectId = Field(..., description="ID da empresa associada a este documento")
    tipo: str = Field(..., description="Tipo de documento: Licença Ambiental, Alvará, AVCB, etc.")
    orgao: str = Field(..., description="Órgão fiscalizador ou emissor")
    numero_processo: Optional[str] = None
    data_emissao: datetime
    data_vencimento: datetime
    status: str = Field(default="Ativo", description="Ativo, Vencido, Em Renovação, Cancelado")
    valor_renovacao: float = Field(default=0.0, description="Valor financeiro cobrado para realizar a renovação")
    responsavel_renovacao_id: PyObjectId = Field(..., description="Consultor responsável pela renovação técnica")

class DocumentoCreate(DocumentoBase):
    pass

class DocumentoUpdate(BaseModel):
    empresa_id: Optional[PyObjectId] = None
    tipo: Optional[str] = None
    orgao: Optional[str] = None
    numero_processo: Optional[str] = None
    data_emissao: Optional[datetime] = None
    data_vencimento: Optional[datetime] = None
    status: Optional[str] = None
    valor_renovacao: Optional[float] = None
    responsavel_renovacao_id: Optional[PyObjectId] = None

class DocumentoResponse(MongoBaseModel, DocumentoBase):
    pass

class DocumentoDB(MongoBaseModel, DocumentoBase):
    pass
