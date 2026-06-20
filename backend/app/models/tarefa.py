from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.object_id import MongoBaseModel, PyObjectId

class HistoricoObservacao(BaseModel):
    data: datetime = Field(default_factory=datetime.utcnow)
    usuario_id: PyObjectId
    texto: str
    autor: Optional[str] = None

class TarefaBase(BaseModel):
    documento_id: Optional[PyObjectId] = Field(default=None, description="Documento do qual a condicionante faz parte (opcional)")
    empresa_id: PyObjectId = Field(..., description="Empresa atrelada a esta condicionante")
    classe_servico_id: Optional[PyObjectId] = Field(default=None, description="Classe de serviço vinculada a esta condicionante (opcional)")
    titulo: str
    descricao: Optional[str] = None
    tipo_id: str = Field(default="checklist_interno", description="checklist_interno, envio_orgao, laudo_tecnico, etc.")
    cliente_executa: bool = Field(default=False, description="True se deve ser feita pelo cliente no módulo empresa, False se é interna da consultoria")
    status: str = Field(default="Pendente", description="Pendente, Em Andamento, Aguardando Auditoria, Concluído, Atrasado")
    responsavel_id: PyObjectId = Field(..., description="Usuário responsável pela execução (consultor ou cliente)")
    data_vencimento: datetime
    valor_estimado: float = Field(default=0.0, description="Receita cobrada ao executar esta condicionante")
    data_conclusao: Optional[datetime] = None
    comprovante_url: Optional[str] = None
    comprovante_key: Optional[str] = Field(default=None, description="Nome da chave/objeto no MinIO correspondente ao comprovante")
    periodicidade: str = Field(default="Mensal", description="Diária, Semanal, Mensal, Outra")
    historico_observacoes: List[HistoricoObservacao] = Field(default_factory=list)
    e_pre_requisito: bool = Field(default=False, description="Se True, é pré-requisito para renovação e não deve ser resetada como Pendente ao renovar")

class TarefaCreate(TarefaBase):
    pass

class TarefaUpdate(BaseModel):
    documento_id: Optional[PyObjectId] = None
    empresa_id: Optional[PyObjectId] = None
    classe_servico_id: Optional[PyObjectId] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo_id: Optional[str] = None
    cliente_executa: Optional[bool] = None
    status: Optional[str] = None
    responsavel_id: Optional[PyObjectId] = None
    data_vencimento: Optional[datetime] = None
    valor_estimado: Optional[float] = None
    data_conclusao: Optional[datetime] = None
    comprovante_url: Optional[str] = None
    comprovante_key: Optional[str] = None
    periodicidade: Optional[str] = None
    historico_observacoes: Optional[List[HistoricoObservacao]] = None
    e_pre_requisito: Optional[bool] = None

class TarefaResponse(MongoBaseModel, TarefaBase):
    pass

class TarefaDB(MongoBaseModel, TarefaBase):
    pass
