FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY apps ./apps
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY src/db/migrations ./dist/src/db/migrations
COPY swagger.yaml ./dist/swagger.yaml
COPY public ./dist/public
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
