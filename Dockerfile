FROM node:22 as builder
WORKDIR /data
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src src

RUN npm config set cache /npm-cache
RUN npm pkg delete scripts.prepare
RUN npm ci
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /data

ENV NODE_ENV=production

RUN npm config set cache /npm-cache

COPY package*.json ./
COPY config /data/config
COPY prisma ./prisma
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev
RUN npx prisma generate
COPY --from=builder /data/build /data/build/
COPY swagger.yaml /data/build/swagger.yaml

CMD ["sh", "-c", "npx prisma migrate deploy && node build/src/index.js"]
