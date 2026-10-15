# Ultraviolet + Scramjet on one port (8080).
#
#   docker build -t gnmath-proxy .
#   docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy
#
# The build has two stages: the first obfuscates the start page's script, and only its
# output is copied into the final image. The readable source stays in the repo.

# ---- Stage 1: obfuscate the page script ----
FROM node:lts-alpine AS build
WORKDIR /build
COPY build/package.json ./
RUN npm install --omit=dev
COPY build/obfuscate.mjs ./
COPY public ./public
RUN node obfuscate.mjs public

# ---- Stage 2: the server ----
FROM node:lts-alpine

ENV NODE_ENV=production
WORKDIR /app

# Some dependencies compile native code.
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

COPY . .
# Replace the readable page with the obfuscated one.
COPY --from=build /build/public ./public

EXPOSE 8080
CMD ["node", "src/index.js"]
