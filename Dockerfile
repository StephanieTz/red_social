# ── Etapa 1: compila el frontend React ──
FROM node:22-bookworm-slim AS front
WORKDIR /front
COPY FRONTEND/package*.json ./
RUN npm ci
COPY FRONTEND/ ./
RUN npm run build

# ── Etapa 2: servidor Node (Express + sharp + Prisma) ──
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY BACKEND ./BACKEND
COPY index.js ./
COPY --from=front /front/dist ./FRONTEND/dist
EXPOSE 4000
# Aplica las migraciones pendientes y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
