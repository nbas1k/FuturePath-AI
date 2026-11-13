# Образ для размещения FuturePath AI (не проверен на этом компьютере: Docker не установлен).
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV DATABASE_URL="file:/data/dev.db" AI_PROVIDER="none" NODE_ENV=production
RUN npm run build
# /data: сюда монтируется постоянный диск, иначе база сбрасывается при каждом перезапуске
VOLUME /data
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p ${PORT:-3001}"]
