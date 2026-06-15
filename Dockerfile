FROM node:20-alpine

WORKDIR /app

# Build tools for native modules
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build frontend
COPY . .
RUN npm run build:web

# Create data directory for SQLite persistence
RUN mkdir -p /data

EXPOSE 8080

ENV NODE_ENV=production
ENV DB_PATH=/data/schedule.db
ENV PORT=8080

CMD ["node", "server/index.js"]
