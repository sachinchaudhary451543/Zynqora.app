# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build && test -f dist/main.js

EXPOSE 3000

CMD ["node", "start.js"]
