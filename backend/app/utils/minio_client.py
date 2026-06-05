import io
import logging
from minio import Minio
from app.config import settings

logger = logging.getLogger("minio")

minio_client = None

def init_minio():
    global minio_client
    try:
        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        # Ensure bucket exists
        if not minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
            minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
            logger.info(f"Bucket '{settings.MINIO_BUCKET_NAME}' criado com sucesso no MinIO.")
        else:
            logger.info(f"Bucket '{settings.MINIO_BUCKET_NAME}' já existe.")
    except Exception as e:
        logger.error(f"Erro de conexão/inicialização do MinIO: {e}")
        minio_client = None

# Initialize on import
init_minio()

def upload_to_minio(object_name: str, file_data: io.BytesIO, length: int, content_type: str) -> bool:
    if not minio_client:
        # Re-try initialization just in case MinIO came online later
        init_minio()
        if not minio_client:
            logger.warning("MinIO não inicializado. Não foi possível realizar upload.")
            return False
    try:
        file_data.seek(0)
        minio_client.put_object(
            settings.MINIO_BUCKET_NAME,
            object_name,
            file_data,
            length,
            content_type=content_type
        )
        return True
    except Exception as e:
        logger.error(f"Falha ao realizar upload para o MinIO: {e}")
        return False

def get_from_minio(object_name: str):
    if not minio_client:
        init_minio()
        if not minio_client:
            return None
    try:
        response = minio_client.get_object(settings.MINIO_BUCKET_NAME, object_name)
        return response
    except Exception as e:
        logger.error(f"Falha ao obter objeto do MinIO: {e}")
        return None
