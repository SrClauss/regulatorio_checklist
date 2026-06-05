import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from bson import ObjectId

@pytest.mark.asyncio
async def test_add_task_observation(client, db, test_consultor, test_empresa, admin_headers):
    # Create a dummy task
    task_data = {
        "empresa_id": test_empresa["_id"],
        "documento_id": None,
        "titulo": "Tarefa de Teste para Observacao",
        "cliente_executa": False,
        "status": "Pendente",
        "responsavel_id": test_consultor["_id"],
        "data_vencimento": "2026-12-31T00:00:00",
        "valor_estimado": 100.0,
        "periodicidade": "Mensal",
        "historico_observacoes": []
    }
    inserted = await db.tarefas.insert_one(task_data)
    task_id = str(inserted.inserted_id)

    # Post an observation
    response = await client.post(
        f"/api/tarefas/{task_id}/observacao?texto=Solicito o documento de comprovante de laudo.",
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["historico_observacoes"]) == 1
    assert data["historico_observacoes"][0]["texto"] == "Solicito o documento de comprovante de laudo."
    assert data["historico_observacoes"][0]["autor"] is not None

@pytest.mark.asyncio
@patch("app.routes.tarefas.upload_to_minio")
@patch("app.routes.tarefas.get_from_minio")
async def test_upload_and_download_comprovante(mock_get, mock_upload, client, db, test_consultor, test_empresa, admin_headers):
    # Setup mocks
    mock_upload.return_value = True
    
    dummy_file_response = MagicMock()
    dummy_file_response.read.return_value = b"fake pdf content"
    mock_get.return_value = dummy_file_response

    # Create dummy task
    task_data = {
        "empresa_id": test_empresa["_id"],
        "documento_id": None,
        "titulo": "Tarefa para Upload",
        "cliente_executa": True,
        "status": "Pendente",
        "responsavel_id": test_consultor["_id"],
        "data_vencimento": "2026-12-31T00:00:00",
        "valor_estimado": 150.0,
        "periodicidade": "Mensal",
        "historico_observacoes": []
    }
    inserted = await db.tarefas.insert_one(task_data)
    task_id = str(inserted.inserted_id)

    # Upload
    file_payload = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
    upload_response = await client.post(
        f"/api/tarefas/{task_id}/upload-comprovante",
        files=file_payload,
        headers=admin_headers
    )
    assert upload_response.status_code == status.HTTP_200_OK
    uploaded_data = upload_response.json()
    assert uploaded_data["comprovante_url"] == f"/api/tarefas/{task_id}/download"
    assert uploaded_data["comprovante_key"] is not None

    # Download
    download_response = await client.get(
        f"/api/tarefas/{task_id}/download",
        headers=admin_headers
    )
    assert download_response.status_code == status.HTTP_200_OK
    assert download_response.content == b"fake pdf content"
