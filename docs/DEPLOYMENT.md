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

## Option 2: Cloud PaaS (Vercel + Render/Railway + Managed Postgres)

### Step 1: PostgreSQL Database (Neon / Supabase / Railway)
1. Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the pooled connection string `DATABASE_URL`.

### Step 2: Backend API (Render / Railway / Fly.io)
1. Connect your GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Set service type to **Web Service** (Node.js).
3. Configuration:
   - **Root Directory**: `.`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @intellisave/shared build && pnpm --filter @intellisave/api prisma generate && pnpm --filter @intellisave/api build`
   - **Start Command**: `node apps/api/dist/server.js`
4. Set Environment Variables:
   - `DATABASE_URL`: *(Your Postgres connection string)*
   - `NODE_ENV`: `production`
   - `API_PORT`: `3001`
   - `API_HOST`: `0.0.0.0`
5. Deploy. You will receive a URL such as `https://lumora-api.onrender.com`.

### Step 3: Database Migration & Seeding
From your local terminal connected to that remote database:
```bash
DATABASE_URL="your-remote-db-url" pnpm db:push
DATABASE_URL="your-remote-db-url" pnpm db:seed
```

### Step 4: Frontend UI (Vercel / Netlify / Cloudflare Pages)
1. Connect your repository to [Vercel](https://vercel.com).
2. Set Framework Preset: **Vite**.
3. Configuration:
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - `VITE_API_URL`: `https://lumora-api.onrender.com`
   - `VITE_WS_URL`: `https://lumora-api.onrender.com`
5. Deploy.

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
