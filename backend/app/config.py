from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    MONGODB_URI: str = Field(default="mongodb://localhost:27017")
    DB_NAME: str = Field(default="claudio_regulatoria")
    JWT_SECRET: str = Field(default="sua_chave_secreta_super_segura_para_fastapi_jwt_2026")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)
    
    VAPID_CLAIM_EMAIL: str = Field(default="mailto:roberto@consultoria.com.br")
    VAPID_PUBLIC_KEY: str = Field(default="")
    VAPID_PRIVATE_KEY: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
