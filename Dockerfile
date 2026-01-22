# Usa uma imagem leve do Node.js
FROM node:20-alpine

# Instala o OpenSSL (Necessário para o Prisma funcionar no Alpine)
RUN apk -U add openssl

# Cria a pasta de trabalho dentro do contentor
WORKDIR /app

# Copia os ficheiros de dependências primeiro
COPY package*.json ./

# Instala as dependências (com a correção para o React 19)
RUN npm install --legacy-peer-deps

# Copia o resto do código do projeto
COPY . .

# Gera o cliente do banco de dados (Prisma)
# Agora vai funcionar porque criámos o schema.prisma e instalamos o OpenSSL
RUN npx prisma generate

# Expõe as portas
EXPOSE 3000 8080

# O comando que vai rodar quando o contentor iniciar
CMD ["npm", "run", "dev"]