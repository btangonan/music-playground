# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
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

# Copy built dist from builder stage
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy compiled shared types to match package.json exports
COPY --from=builder /app/apps/api/dist/shared/types/schemas.js ./shared/types/schemas.js

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "dist/apps/api/src/index.js"]
