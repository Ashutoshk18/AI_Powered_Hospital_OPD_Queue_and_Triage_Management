# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# apps/api/Dockerfile
# Node.js Express API — production build
# ──────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and install ALL deps (including dev, needed for tsc)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client (uses PostgreSQL schema in Docker)
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only production deps + compiled output
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 5000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
