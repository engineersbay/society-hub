# SocietyHub Web image (nginx serving Vite build)
# Prefer Azure Static Web Apps in staging/prod for cost; use this image for all-in Container Apps.
#   docker build -f devops/docker/web.Dockerfile -t societyhub-web:local .

FROM oven/bun:1.2-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/auth/package.json packages/auth/
COPY packages/sdk/package.json packages/sdk/
RUN bun install --frozen-lockfile
COPY apps/web apps/web
COPY packages packages
RUN bunx turbo run build --filter=@society-hub/web

FROM nginx:1.27-alpine AS runtime
COPY devops/docker/nginx-web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
