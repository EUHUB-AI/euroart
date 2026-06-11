FROM oven/bun:1.3.4-alpine AS build

WORKDIR /app

COPY package.json ./
COPY scripts ./scripts
COPY index.html ./index.html
COPY css ./css
COPY js ./js
COPY assets ./assets

RUN bun run build

FROM oven/bun:1.3.4-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY scripts ./scripts
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "scripts/dev.ts", "--root", "dist"]
