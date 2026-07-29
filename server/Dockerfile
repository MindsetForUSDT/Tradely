FROM node:20.19.0-alpine AS build
WORKDIR /app
ENV HUSKY=0

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund \
    && test -x node_modules/.bin/tsc \
    && test -x node_modules/.bin/prisma

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:20.19.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]