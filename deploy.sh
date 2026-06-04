#!/bin/bash

# Script de Versionamento, Sincronização e Deploy Automatizado
# Configurações do ambiente
SERVER_IP="2.25.170.196"
SERVER_USER="root"
SERVER_DEST_DIR="/app/regulatorio_checklist"
REPO_URL="https://github.com/SrClauss/regulatorio_checklist"

echo "=========================================================="
echo "🚀 Iniciando processo de Versionamento e Deploy de Claudio"
echo "=========================================================="

# 1. Versionamento de Git
echo "🔄 Verificando repositório Git..."
if [ ! -d ".git" ]; then
    echo "Inicializando repositório Git local..."
    git init
fi

# Configura o controle remoto se ainda não estiver definido
if ! git remote | grep origin > /dev/null; then
    echo "Associando repositório remoto: $REPO_URL"
    git remote add origin "$REPO_URL"
fi

# Adiciona arquivos e realiza commit das alterações
echo "💾 Criando commit das alterações..."
git add .
read -p "Digite a mensagem do commit [Auto-deploy: update and docker-compose]: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Auto-deploy: update and docker-compose"
fi

git commit -m "$COMMIT_MSG"

# Tenta fazer push para a branch ativa (ex: main ou master)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "pushing para o Github na branch $BRANCH..."
git push origin "$BRANCH"

# 2. Sincronização de arquivos via RSync para o servidor
echo "=========================================================="
echo "📦 Sincronizando arquivos com o servidor $SERVER_IP..."
echo "=========================================================="

# Garante que o diretório de destino existe no servidor remoto
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_DEST_DIR"

# Roda o rsync para enviar os arquivos otimizados (ignorando pastas pesadas de desenvolvimento)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude 'backend/uploads/comprovantes/*' \
  --exclude '.env' \
  ./ "$SERVER_USER@$SERVER_IP:$SERVER_DEST_DIR/"

if [ $? -eq 0 ]; then
    echo "✅ Sincronização rsync concluída com sucesso!"
else
    echo "❌ Erro na sincronização rsync."
    exit 1
fi

# 3. Deploy Remoto via Docker Compose
echo "=========================================================="
echo "🐳 Reconstruindo containers Docker no servidor..."
echo "=========================================================="

ssh "$SERVER_USER@$SERVER_IP" "cd $SERVER_DEST_DIR && docker compose down && docker compose up -d --build"

if [ $? -eq 0 ]; then
    echo "=========================================================="
    echo "🎉 Deploy concluído com sucesso!"
    echo "Acesse em http://$SERVER_IP/"
    echo "=========================================================="
else
    echo "❌ Ocorreu um erro ao subir os containers no servidor."
    exit 1
fi
