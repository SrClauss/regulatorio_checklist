from typing import Any, Optional
from bson import ObjectId
from pydantic import BaseModel, Field
from pydantic_core import core_schema

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x),
                when_used='json'
            ),
        )

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if not isinstance(v, str) or not ObjectId.is_valid(v):
            raise ValueError("ID do MongoDB inválido")
        return ObjectId(v)

class MongoBaseModel(BaseModel):
    """Classe base para modelos que lidam com dados vindos do MongoDB,
    mapeando o campo '_id' para 'id' de forma transparente nas respostas da API."""
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    model_config = {
        # Permite usar o nome real (id) ou alias (_id) ao popular/instanciar
        "populate_by_name": True,
        # Habilita suporte a instâncias arbitrárias como o ObjectId do MongoDB
        "arbitrary_types_allowed": True
    }
