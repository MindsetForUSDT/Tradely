FROM node:20.19.0-alpine AS build
WORKDIR /app
ENV HUSKY=0

COPY package.json package-lock.json ./
# TypeScript, Vite and the React plugin are build-time devDependencies.
# --include=dev makes the build deterministic even when the host exports
# NODE_ENV=production or npm_config_production=true.
RUN npm ci --include=dev --no-audit --no-fund \
    && test -x node_modules/.bin/tsc \
    && test -x node_modules/.bin/vite

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
