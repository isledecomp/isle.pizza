FROM node:22-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm install

COPY server/src/ ./src/
COPY server/migrations/ ./migrations/
COPY server/wrangler.toml server/tsconfig.json ./
COPY server/.dev.vars* ./

EXPOSE 8788

# Apply D1 migrations then start wrangler dev.
# wrangler runs as PID 1 via exec so it receives SIGINT (Ctrl+C).
CMD node_modules/.bin/wrangler d1 migrations apply isle-pizza --local && \
    exec node_modules/.bin/wrangler dev --ip 0.0.0.0 --port 8788
