# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
# Install deps (no lockfile on first run; npm will create one)
RUN npm install

COPY . .

# VITE_API_BASE is baked in at build time.
# With the nginx reverse-proxy, the browser calls /api which nginx forwards
# to the backend container – so a relative path is correct here.
ARG  VITE_API_BASE=/api
ENV  VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
