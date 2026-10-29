# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# apps/web/Dockerfile
# React frontend — production build served by Nginx
# ──────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the production bundle
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: serve SPA, proxy /api to the API service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
