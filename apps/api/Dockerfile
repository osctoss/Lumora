FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client & Build TypeScript
RUN pnpm --filter @intellisave/api prisma generate
RUN pnpm --filter @intellisave/shared build
RUN pnpm --filter @intellisave/api build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY --from=builder /app /app

ENV NODE_ENV=production
ENV API_PORT=3001
ENV API_HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]
