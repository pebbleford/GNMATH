#!/usr/bin/env bash
# Runs the open-source Ultraviolet-App web proxy in Docker on this machine (port 8080).
# Source: https://github.com/titaniumnetwork-dev/Ultraviolet-App (GPL-3.0, no longer maintained upstream).
# Read it first. Needs Docker. Untested here.
set -euo pipefail
PORT="${PORT:-8080}"
DIR="$HOME/ultraviolet-app"

if ! command -v docker >/dev/null 2>&1; then echo "Docker isn't installed."; exit 1; fi

if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone --depth 1 https://github.com/titaniumnetwork-dev/Ultraviolet-App "$DIR"; fi

echo "==> Building (can take a few minutes)"
sudo docker build -t ultraviolet-app "$DIR"

sudo docker rm -f ultraviolet-app >/dev/null 2>&1 || true
sudo docker run -d --name ultraviolet-app --restart unless-stopped -p "$PORT:8080" ultraviolet-app

sudo iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport "$PORT" -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo
echo "Proxy is running on port $PORT: http://<vm-ip>:$PORT"
echo "Still to do: add an ingress rule for TCP $PORT in the Oracle console."
echo "Service workers need HTTPS (except on localhost), so for real use put a domain with HTTPS in front,"
echo "for example a Cloudflare Tunnel or Caddy. Don't leave it open to the whole internet."
