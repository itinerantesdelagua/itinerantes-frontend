# Imagen única para las tres apps del workspace (public-site, portal, admin).
# Cada servicio de Railway define la variable APP con el nombre de su app en angular.json.

FROM node:22-alpine AS build
ARG APP
RUN test -n "$APP" || (echo "Falta la variable APP (public-site, portal o admin)" && exit 1)
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build "$APP" --configuration production

FROM caddy:2-alpine
ARG APP
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/${APP}/browser /srv
EXPOSE 8080
