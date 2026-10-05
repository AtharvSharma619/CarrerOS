FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci
COPY client ./client
COPY server ./server
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/client/package.json ./client/package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npm", "run", "start", "--workspace=server"]
