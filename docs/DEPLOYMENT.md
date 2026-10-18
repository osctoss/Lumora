# Lumora — Deployment Guide

This guide covers three deployment strategies for the **Lumora** Smart Building Digital Twin platform:

1. [Option 1: Docker Compose (Single Server / VPS) — Recommended for Self-Hosting](#option-1-docker-compose-single-server--vps)
2. [Option 2: Cloud PaaS (Vercel + Render/Railway + Managed Postgres)](#option-2-cloud-paas-vercel--renderrailway--managed-postgres)
3. [Option 3: Linux VPS with PM2 & Nginx](#option-3-linux-vps-with-pm2--nginx)

---

## Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/lumora?schema=public` |
| `API_PORT` | Port for the Fastify HTTP + WebSocket API | `3001` |
| `API_HOST` | Host interface to bind to | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `production` |
| `VITE_API_URL` | Frontend URL to access backend API | `http://localhost:3001` or `https://api.yourdomain.com` |
| `VITE_WS_URL` | Frontend WebSocket endpoint | `http://localhost:3001` or `https://api.yourdomain.com` |

---

## Option 1: Docker Compose (Single Server / VPS)

### Prerequisites
- Docker (v24+) & Docker Compose installed on your host/server.

### Steps
1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/osctoss/Lumora.git
   cd Lumora
   ```

2. Start the entire stack with Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. Initialize the database schema & seeds:
   ```bash
   docker compose -f docker-compose.prod.yml exec api pnpm --filter @intellisave/api prisma db push
   docker compose -f docker-compose.prod.yml exec api pnpm --filter @intellisave/api exec tsx ../../prisma/seed.ts
   ```

4. Access the platform:
   - **Frontend Dashboard**: `http://<your-server-ip>` (Port 80)
   - **Backend API & WebSockets**: `http://<your-server-ip>:3001`

---

## Option 2: Render Deployment (Blueprint or Manual Dashboard)

### Method A: 1-Click Render Blueprint (Recommended)
Lumora includes a pre-configured `render.yaml` Blueprint at the repository root.

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your GitHub repository (`Lumora`).
4. Render will detect `render.yaml` and preview the 3 services:
   - `lumora-db` (PostgreSQL Database)
   - `lumora-api` (Fastify Web Service)
   - `lumora-web` (Static Site Frontend)
5. Click **Apply**. Render will automatically provision the database, build the backend & frontend, run migrations/seeds, and link all environment variables.

---

### Method B: Manual Render Setup

#### Component 1: Managed PostgreSQL
1. In Render, click **New +** → **PostgreSQL**.
2. Settings:
   - **Name**: `lumora-db`
   - **Database**: `lumora`
   - **User**: `lumora`
   - **Region**: Oregon (or nearest)
   - **Plan**: Free
3. Click **Create Database**. Copy the **Internal Database URL** (e.g., `postgresql://lumora:...@dpg-...-a:5432/lumora`).

#### Component 2: Backend API (Web Service)
1. In Render, click **New +** → **Web Service** → Connect your GitHub repo.
2. Settings:
   - **Name**: `lumora-api`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Root Directory**: `.` *(leave blank / dot)*
   - **Build Command**:
     ```bash
     npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build:api
     ```
   - **Start Command**:
     ```bash
     pnpm db:push && pnpm db:seed && node apps/api/dist/server.js
     ```
   - **Health Check Path**: `/api/health`
3. Environment Variables:
   - `NODE_ENV`: `production`
   - `NODE_VERSION`: `20.18.0`
   - `API_HOST`: `0.0.0.0`
   - `DATABASE_URL`: *(Paste your Render PostgreSQL Internal Database URL)*
   - `DEFAULT_SIMULATION_SPEED`: `1`
   - `DEFAULT_TARIFF_INR_PER_KWH`: `8`
   - `DEFAULT_CO2_FACTOR_KG_PER_KWH`: `0.82`
4. Click **Create Web Service**. Wait for the build to complete and note your backend URL (e.g. `https://lumora-api.onrender.com`).

#### Component 3: Frontend Web Dashboard (Static Site)
1. In Render, click **New +** → **Static Site** → Connect your GitHub repo.
2. Settings:
   - **Name**: `lumora-web`
   - **Branch**: `main`
   - **Root Directory**: `.` *(leave blank / dot)*
   - **Build Command**:
     ```bash
     npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build:web
     ```
   - **Publish Directory**: `apps/web/dist`
3. Environment Variables:
   - `NODE_VERSION`: `20.18.0`
   - `VITE_API_URL`: `https://lumora-api.onrender.com` *(Your Backend API URL from Step 2)*
   - `VITE_WS_URL`: `https://lumora-api.onrender.com` *(Same URL for Socket.IO)*
4. Redirects / Rewrites (Under the **Redirects/Rewrites** tab):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
5. Click **Create Static Site**.

---

## Option 3: Linux VPS with PM2 & Nginx

### 1. Build Production Bundles on VPS
```bash
# Install dependencies & build all packages
pnpm install --frozen-lockfile
pnpm build
pnpm db:push
pnpm db:seed
```

### 2. Run API with PM2
```bash
npm install -g pm2
pm2 start apps/api/dist/server.js --name "lumora-api"
pm2 save
pm2 startup
```

### 3. Nginx Configuration
Create `/etc/nginx/sites-available/lumora`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/lumora/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/lumora /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Enable SSL with Certbot
```bash
sudo certbot --nginx -d yourdomain.com
```
