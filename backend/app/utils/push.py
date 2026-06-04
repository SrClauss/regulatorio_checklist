import json
from typing import Optional
from fastapi import HTTPException
from pywebpush import webpush, WebPushException
from app.config import settings

def send_push_notification(subscription: dict, title: str, body: str, icon: str = "/logo192.png", badge: str = "/badge.png", url: str = "/") -> bool:
    """Envia uma notificação push para a inscrição especificada.
    Retorna True se enviado com sucesso, False se falhar, e levanta exceção se a inscrição for inválida (410 Gone).
    """
    # Verifica se as chaves VAPID foram configuradas
    if not settings.VAPID_PRIVATE_KEY:
        print("Chave VAPID privada não configurada. Notificação ignorada.")
        return False
        
    payload = {
        "notification": {
            "title": title,
            "body": body,
            "icon": icon,
            "badge": badge,
            "data": {
                "url": url
            }
        }
    }
    
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": settings.VAPID_CLAIM_EMAIL
            }
        )
        return True
    except WebPushException as ex:
        print(f"Falha ao enviar notificação push: {ex}")
        if ex.response is not None and ex.response.status_code in [404, 410]:
            # Retorna falso ou joga erro para remover inscrição expirada no banco
            raise HTTPException(status_code=410, detail="Inscrição push inválida ou expirada")
        return False
