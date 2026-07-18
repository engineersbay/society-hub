# SocietyHub Web image (nginx serving Vite build)
# Prefer Azure Static Web Apps in staging/prod for cost; use this image if you want all-in Container Apps.
#   docker build -f devops/docker/web.Dockerfile -t societyhub-web:local .

FROM oven/bun:1.2-alpine AS build
WORKDIR /app
# COPY package.json bun.lock turbo.json ./
# COPY apps/web/package.json apps/web/
# COPY packages ./packages
# RUN bun install --frozen-lockfile
# COPY . .
# RUN bunx turbo run build --filter=web

FROM nginx:1.27-alpine AS runtime
# COPY devops/docker/nginx-web.conf /etc/nginx/conf.d/default.conf
# COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
# Temporary stub:
CMD ["sh", "-c", "echo 'SocietyHub Web image: replace when apps/web is scaffolded' && sleep infinity"]
