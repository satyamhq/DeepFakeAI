FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
RUN npm install -g turbo@^2.2.1
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace
RUN turbo prune @truemedia/scheduler --docker

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
WORKDIR /app
COPY --from=builder /app/out/json .
ENV HUSKY=0
RUN npm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY prisma ./prisma
RUN npx prisma generate
RUN npx turbo run build --filter=@truemedia/scheduler
RUN npm prune --omit=dev

FROM base AS release
WORKDIR /app

COPY --from=install /app .
ENV PORT=80
EXPOSE 80/tcp
ENTRYPOINT ["/usr/local/bin/node", "apps/scheduler/dist/server.js"]
