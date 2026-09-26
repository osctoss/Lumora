FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json tsconfig.json vite.config.ts index.html postcss.config.js tailwind.config.js ./
COPY src ./src

RUN pnpm install
RUN pnpm run build

# Production Nginx Web Server
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
