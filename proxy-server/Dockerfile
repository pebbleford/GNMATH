# Ultraviolet + Scramjet on one port (8080).
#
#   docker build -t gnmath-proxy .
#   docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy

FROM node:lts-alpine

ENV NODE_ENV=production
WORKDIR /app

# Some dependencies compile native code.
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080
CMD ["node", "src/index.js"]
