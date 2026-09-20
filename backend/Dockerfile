# ==============================================================================
# Backend Dockerfile - Multi-stage Build
# ==============================================================================

# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine compatibility
RUN apk add --no-cache openssl

# Copy dependency manifests and Prisma schema for efficient caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies required for tsc)
RUN npm ci

# Generate Prisma Client code
RUN npx prisma generate

# Copy source code, configurations, and ABI definitions
COPY tsconfig.json ./
COPY src ./src/
COPY abis ./abis/

# Build TypeScript to JavaScript in dist/
RUN npm run build

# ==============================================================================
# Stage 2: Lean Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl and bash/sh utilities
RUN apk add --no-cache openssl bash

# Copy dependency manifests and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate production Prisma Client
RUN npx prisma generate

# Copy built artifacts and ABIs from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/abis ./abis

# Copy entrypoint script to run migrations before server start
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# SECURITY: Run as non-root user (VULN-12)
# This limits blast radius if the application is exploited.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
