# ── Build ──
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# URL da API embutida no build (VITE_* é resolvido em tempo de compilação).
# Default: /api (mesma origem → nginx faz o proxy). Para chamar um backend
# externo direto do browser: docker compose build --build-arg VITE_API_URL=https://... /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Runtime (nginx) ──
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
