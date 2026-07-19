# SocietyHub Manage image (nginx serving Vite build)
# Prefer Azure Static Web Apps in staging/prod for cost; use this image for all-in Container Apps.
#   docker build -f devops/docker/manage.Dockerfile -t societyhub-manage:local .

FROM oven/bun:1.2-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/manage/package.json apps/manage/
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/auth/package.json packages/auth/
COPY packages/sdk/package.json packages/sdk/
RUN bun install --frozen-lockfile
COPY apps/manage apps/manage
COPY packages packages
RUN bunx turbo run build --filter=@society-hub/manage

FROM nginx:1.27-alpine AS runtime
COPY devops/docker/nginx-manage.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/manage/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
