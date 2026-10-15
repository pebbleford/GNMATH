# Scramjet demo proxy, built from the upstream Scramjet-App repo.
# Runs on its own port (8081 on the host) next to Ultraviolet (8080).
# The upstream Dockerfile copies a package-lock.json that the repo doesn't have,
# so this one installs dependencies with npm directly.
#
#   docker build -t scramjet-app .
#   docker run -d --name scramjet-app --restart unless-stopped -p 8081:8080 scramjet-app

FROM node:20-alpine

ENV NODE_ENV=production
RUN apk add --no-cache git python3 make g++

WORKDIR /app
RUN git clone --depth 1 https://github.com/MercuryWorkshop/Scramjet-App .
RUN npm install --omit=dev

EXPOSE 8080
CMD ["node", "src/index.js"]
