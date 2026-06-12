FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8000
ENV UPLOAD_DIR=/app/uploads

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml knexfile.js ./
COPY src ./src

RUN mkdir -p /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 8000

CMD ["pnpm", "start"]
