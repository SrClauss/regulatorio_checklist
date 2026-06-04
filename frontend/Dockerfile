# Estágio 1: Compilação do Frontend
FROM node:20-alpine AS build

WORKDIR /app

# Copia e instala dependências do npm
COPY package*.json ./
RUN npm install

# Copia os arquivos do código e realiza a compilação
COPY . .
RUN npm run build

# Estágio 2: Servidor Web Nginx de Produção
FROM nginx:alpine

# Copia o bundle compilado para a pasta de distribuição padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Substitui a configuração default do Nginx pela nossa com Proxy Reverso
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
