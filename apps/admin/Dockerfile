# syntax=docker/dockerfile:1

# Static site: build with Vite, serve the output with nginx. VITE_ADMIN_API_BASE_URL
# is baked into the JS bundle at build time (Vite convention), so it must be
# passed as a build arg, not just a runtime env var.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_ADMIN_API_BASE_URL
ENV VITE_ADMIN_API_BASE_URL=$VITE_ADMIN_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=8080
EXPOSE 8080
