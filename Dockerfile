FROM node:22-alpine AS base

# Pin pnpm: 10.x still reads pnpm.onlyBuiltDependencies from package.json (needed
# to build sharp/esbuild). pnpm 11 dropped that field, and @latest is not
# reproducible for a Docker build.
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

WORKDIR /app

# --- Dependencies ---
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

# --- Runtime ---
FROM base AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=build /app ./

EXPOSE 3000

# Bind to all interfaces so the container is reachable via the published port
CMD ["pnpm", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
