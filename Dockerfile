# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/entities/package.json packages/entities/
COPY packages/types/package.json packages/types/
COPY packages/business-logic/package.json packages/business-logic/
COPY packages/resources/package.json packages/resources/
COPY packages/execution/package.json packages/execution/
COPY packages/cli/package.json packages/cli/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
COPY packages/ packages/
COPY server.ts tsconfig.json ./
COPY scripts/ scripts/
RUN pnpm build

# Stage 3: Runtime
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache tini
WORKDIR /app

COPY --from=build /app ./
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--"]
CMD ["/app/scripts/docker-entrypoint.sh"]
