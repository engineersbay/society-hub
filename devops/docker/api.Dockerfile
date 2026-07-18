# SocietyHub API image
# Finalize when apps/api exists. Build from repo root:
#   docker build -f devops/docker/api.Dockerfile -t societyhub-api:local .

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
# Placeholders — adjust to Turborepo layout when scaffolded:
# COPY package.json bun.lock turbo.json ./
# COPY apps/api/package.json apps/api/
# COPY packages ./packages
# RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# COPY --from=deps /app /app
# WORKDIR /app/apps/api
EXPOSE 3000
# HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# USER bun
# CMD ["bun", "run", "src/index.ts"]

# Temporary stub command so the file is valid before apps exist:
CMD ["sh", "-c", "echo 'SocietyHub API image: replace CMD when apps/api is scaffolded' && sleep infinity"]
