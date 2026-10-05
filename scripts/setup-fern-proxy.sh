#!/usr/bin/env bash
# Sets up Fern proxy as a service on an Ubuntu VM (tested on nothing yet; read it first).
# Usage: SERVER=<db-host>:5432 bash setup-fern-proxy.sh
# Optional: SITE=1 also installs nginx and serves the GNMATH site on port 80.
set -euo pipefail

: "${SERVER:?Set SERVER to your Postgres address, e.g. SERVER=10.0.0.5:5432}"
REPO_URL="${REPO_URL:-https://github.com/pebbleford/gnmath.git}"
APP_DIR="$HOME/gnmath"
RUN_USER="$(id -un)"

echo "==> Installing build tools"
sudo apt-get update
sudo apt-get install -y build-essential git curl

if ! command -v cargo >/dev/null 2>&1; then
  echo "==> Installing Rust"
  curl -sSf https://sh.rustup.rs | sh -s -- -y
fi
# shellcheck disable=SC1091
. "$HOME/.cargo/env"

echo "==> Getting the code"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO_URL" "$APP_DIR"; fi

echo "==> Building Fern proxy (can take 10-30 minutes)"
(cd "$APP_DIR/fern-proxy" && cargo build --release)

echo "==> Creating the service"
sudo tee /etc/systemd/system/fern-proxy.service >/dev/null <<UNIT
[Unit]
Description=Fern proxy
After=network.target

[Service]
User=$RUN_USER
WorkingDirectory=$APP_DIR/fern-proxy
Environment=SERVER=$SERVER
Environment=CONFIG_FILE=$APP_DIR/fern-proxy/examples/config.toml
ExecStart=$APP_DIR/fern-proxy/target/release/fern-proxy
Restart=always

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now fern-proxy

echo "==> Opening port 30000 on the VM firewall"
sudo iptables -C INPUT -p tcp --dport 30000 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 30000 -j ACCEPT
sudo apt-get install -y iptables-persistent >/dev/null 2>&1 || true
sudo netfilter-persistent save 2>/dev/null || true

if [ "${SITE:-0}" = "1" ]; then
  echo "==> Serving the GNMATH site with nginx"
  sudo apt-get install -y nginx
  sudo rm -rf /var/www/html/*
  sudo cp -r "$APP_DIR"/index.html "$APP_DIR"/assets "$APP_DIR"/games "$APP_DIR"/fern-proxy.html /var/www/html/
  sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  sudo netfilter-persistent save 2>/dev/null || true
fi

echo
echo "Done. Check it with: systemctl status fern-proxy"
echo "Still to do in the Oracle console: add an ingress rule for TCP 30000 (and 80 if SITE=1)."
echo "Restrict the source to your app's IP. Fern proxy has no TLS."
