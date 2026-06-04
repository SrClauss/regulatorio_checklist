FROM python:3.12-slim

WORKDIR /app

# Instala dependências básicas do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia os arquivos de requerimentos
COPY requirements.txt .

# Instala as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o restante dos arquivos do backend
COPY . .

# Garante a criação do diretório de uploads local no container
RUN mkdir -p backend/uploads/comprovantes

# Expõe a porta do uvicorn
EXPOSE 8000

# Executa o uvicorn apontando para a aplicação principal
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
