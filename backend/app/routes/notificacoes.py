from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.auth.dependencies import get_current_active_user
from app.models.usuario import UsuarioDB
from app.utils.push import send_push_notification
from app.config import settings

router = APIRouter(prefix="/api/notificacoes", tags=["Notificações Web Push"])

@router.get("/vapid-key")
async def get_vapid_public_key(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Retorna a chave pública VAPID necessária para registrar inscrições no navegador."""
    if not settings.VAPID_PUBLIC_KEY:
        return {
            "vapid_public_key": None,
            "aviso": "Chaves VAPID não configuradas no backend (.env). Para habilitar notificações push, gere as chaves e insira-as no arquivo .env."
        }
    return {"vapid_public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_push(subscription: dict, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Registra ou atualiza os dados da inscrição Web Push para o usuário atual."""
    db = get_database()
    
    # Validação básica do dicionário recebido
    if not subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Inscrição push inválida: falta o endpoint")
        
    # Verifica se esta inscrição exata já existe para o usuário
    existing = await db.inscricoes_push.find_one({
        "usuario_id": current_user.id,
        "subscription.endpoint": subscription["endpoint"]
    })
    
    if existing:
        return {"status": "ok", "message": "Inscrição já estava registrada"}
        
    nova_inscricao = {
        "usuario_id": current_user.id,
        "subscription": subscription,
        "criado_em": datetime.utcnow()
    }
    
    await db.inscricoes_push.insert_one(nova_inscricao)
    return {"status": "ok", "message": "Inscrição push salva com sucesso"}

@router.post("/enviar-teste")
async def send_test_push(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Dispara uma notificação push de teste para todos os dispositivos inscritos do usuário logado."""
    db = get_database()
    
    inscricoes_cursor = db.inscricoes_push.find({"usuario_id": current_user.id})
    inscricoes = await inscricoes_cursor.to_list(length=50)
    
    if not inscricoes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum dispositivo registrado para receber notificações push deste usuário. Registre o Service Worker no navegador primeiro."
        )
        
    sucessos = 0
    erros_limpar = []
    
    for ins in inscricoes:
        try:
            ok = send_push_notification(
                subscription=ins["subscription"],
                title="Cláudio Gestão - Teste",
                body=f"Olá {current_user.nome}! As notificações push do seu navegador estão configuradas corretamente.",
                url="/dashboard"
            )
            if ok:
                sucessos += 1
        except HTTPException as ex:
            if ex.status_code == 410:
                # Dispositivo expirou, adiciona para limpar
                erros_limpar.append(ins["_id"])
                
    # Limpa inscrições inválidas
    if erros_limpar:
        await db.inscricoes_push.delete_many({"_id": {"$in": erros_limpar}})
        
    return {
        "dispositivos_tentados": len(inscricoes),
        "sucessos": sucessos,
        "limpezas_realizadas": len(erros_limpar)
    }

@router.get("/vistos", response_model=List[str])
async def get_alertas_vistos(current_user: UsuarioDB = Depends(get_current_active_user)):
    """Retorna a lista de IDs de alertas que foram marcados como vistos pelo usuário."""
    db = get_database()
    cursor = db.alertas_vistos.find({"usuario_id": current_user.id})
    vistos = await cursor.to_list(length=1000)
    return [v["alerta_id"] for v in vistos]

@router.post("/vistos/{alerta_id}")
async def marcar_alerta_visto(alerta_id: str, visto: bool = True, current_user: UsuarioDB = Depends(get_current_active_user)):
    """Marca ou desmarca um alerta como visto pelo usuário."""
    db = get_database()
    if visto:
        await db.alertas_vistos.update_one(
            {"usuario_id": current_user.id, "alerta_id": alerta_id},
            {"$set": {"visto": True, "atualizado_em": datetime.utcnow()}},
            upsert=True
        )
    else:
        await db.alertas_vistos.delete_many(
            {"usuario_id": current_user.id, "alerta_id": alerta_id}
        )
    return {"status": "ok", "alerta_id": alerta_id, "visto": visto}
