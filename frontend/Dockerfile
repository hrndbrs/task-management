# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_REVERB_APP_KEY
ARG NEXT_PUBLIC_REVERB_HOST=localhost
ARG NEXT_PUBLIC_REVERB_PORT=8080
ARG NEXT_PUBLIC_REVERB_SCHEME=http
ENV NEXT_PUBLIC_REVERB_APP_KEY=$NEXT_PUBLIC_REVERB_APP_KEY \
    NEXT_PUBLIC_REVERB_HOST=$NEXT_PUBLIC_REVERB_HOST \
    NEXT_PUBLIC_REVERB_PORT=$NEXT_PUBLIC_REVERB_PORT \
    NEXT_PUBLIC_REVERB_SCHEME=$NEXT_PUBLIC_REVERB_SCHEME \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
