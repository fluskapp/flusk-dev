FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/entities/package.json packages/entities/
COPY packages/types/package.json packages/types/
COPY packages/business-logic/package.json packages/business-logic/
COPY packages/resources/package.json packages/resources/
COPY packages/execution/package.json packages/execution/
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY packages/ packages/
COPY server.ts scripts/ ./

# Run with tsx (supports TypeScript directly)
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
