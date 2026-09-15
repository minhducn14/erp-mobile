FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV EXPO_NO_TELEMETRY=1

EXPOSE 8081

CMD ["npx", "expo", "start", "--host", "lan", "--port", "8081"]