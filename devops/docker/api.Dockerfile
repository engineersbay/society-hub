# SocietyHub API image
# Build from repo root:
#   docker build -f devops/docker/api.Dockerfile -t societyhub-api:local .

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/auth/package.json packages/auth/
COPY packages/sdk/package.json packages/sdk/
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app /app
COPY apps/api apps/api
COPY packages packages
COPY turbo.json tsconfig.base.json package.json ./
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
USER bun
CMD ["bun", "run", "src/index.ts"]
