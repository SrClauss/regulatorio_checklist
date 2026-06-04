from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel

class CondicionanteSugerida(BaseModel):
    titulo: str
    frequencia_meses: int = Field(..., description="Frequência em meses (1=Mensal, 3=Trimestral, 6=Semestral, 12=Anual, 0=Única)")
    cliente_executa: bool = Field(default=False, description="True se deve ser feita pelo cliente no módulo empresa, False se é interna da consultoria")
    valor_sugerido: float = Field(default=0.0, description="Preço padrão sugerido para a execução desta condicionante")

class TemplateDocumentoBase(BaseModel):
    segmento: str = Field(..., description="Segmento aplicável, ex: Alimentos, Posto, Saúde")
    nome_documento: str = Field(..., description="Nome do documento, ex: Licença de Operação")
    validade_meses_padrao: int = Field(default=12, description="Vigência padrão em meses")
    valor_renovacao_sugerido: float = Field(default=0.0, description="Preço de renovação sugerido")
    condicionantes_sugeridas: List[CondicionanteSugerida] = Field(default_factory=list)

class TemplateDocumentoCreate(TemplateDocumentoBase):
    pass

class TemplateDocumentoUpdate(BaseModel):
    segmento: Optional[str] = None
    nome_documento: Optional[str] = None
    validade_meses_padrao: Optional[int] = None
    valor_renovacao_sugerido: Optional[float] = None
    condicionantes_sugeridas: Optional[List[CondicionanteSugerida]] = None

class TemplateDocumentoResponse(MongoBaseModel, TemplateDocumentoBase):
    pass

class TemplateDocumentoDB(MongoBaseModel, TemplateDocumentoBase):
    pass
