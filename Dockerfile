# Usa uma imagem leve do Node.js
FROM node:20-alpine

# Cria a pasta de trabalho dentro do contentor
WORKDIR /app

# Copia os ficheiros de dependências primeiro (para aproveitar o cache)
COPY package*.json ./

# Instala todas as dependências
RUN npm install

# Copia o resto do código do projeto
COPY . .

# Gera o cliente do banco de dados (Prisma)
RUN npx prisma generate

# Expõe as portas (3000 = Frontend, 8080 = Backend)
EXPOSE 3000 8080

# O comando que vai rodar quando o contentor iniciar
CMD ["npm", "run", "dev"]