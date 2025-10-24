# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared ./shared
COPY apps/api ./apps/api

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm --filter @music/api build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared ./shared

# Copy API package
COPY apps/api/package.json ./apps/api/
COPY apps/api/dist ./apps/api/dist

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "dist/index.js"]
