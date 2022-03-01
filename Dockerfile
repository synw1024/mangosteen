# Stage 1: build
FROM node:14.15.4 AS builder

WORKDIR /app

RUN npm config set registry https://registry.npm.taobao.org

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: run
FROM nginx:stable-alpine AS app

COPY --from=builder /app/build /app
COPY --from=builder /app/default.conf /etc/nginx/conf.d
