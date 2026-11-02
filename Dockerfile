# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@9.0.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/user-app/package.json apps/user-app/package.json
COPY apps/bank-webhook/package.json apps/bank-webhook/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm db:generate && pnpm build

# Keeps workspace symlinks and Prisma's native engine intact. No local .env files
# enter the build context. Runtime secrets are injected by the container host.
FROM builder AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p /app/apps/user-app/.next/cache && chown -R node:node /app
USER node

FROM runtime AS migrate
CMD ["pnpm", "db:migrate"]

FROM runtime AS webhook
WORKDIR /app/apps/bank-webhook
EXPOSE 3003
CMD ["node", "dist/index.mjs"]

FROM runtime AS web
WORKDIR /app/apps/user-app
EXPOSE 3001
CMD ["pnpm", "exec", "next", "start", "--hostname", "0.0.0.0", "--port", "3001"]
