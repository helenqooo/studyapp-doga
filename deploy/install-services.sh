#!/usr/bin/env bash
# Installs lumi-server and lumi-expo as systemd services running as the invoking user.
# Usage: deploy/install-services.sh [public-host]   (default: this server's public IPv4)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${SUDO_USER:-$(id -un)}"
NODE_BIN="$(dirname "$(command -v node)")"
PUBLIC_HOST="${1:-$(curl -4 -s --max-time 10 ifconfig.me)}"

[ "$RUN_USER" != root ] || { echo "Run as your normal user (it calls sudo itself)." >&2; exit 1; }
[ -n "$PUBLIC_HOST" ] || { echo "Could not detect the public IP; pass it as the first argument." >&2; exit 1; }

for unit in lumi-server lumi-expo; do
  sed -e "s|@USER@|$RUN_USER|g" -e "s|@REPO@|$REPO|g" \
      -e "s|@NODE_BIN@|$NODE_BIN|g" -e "s|@PUBLIC_HOST@|$PUBLIC_HOST|g" \
      "$REPO/deploy/$unit.service" | sudo tee "/etc/systemd/system/$unit.service" >/dev/null
done

sudo systemctl daemon-reload
sudo systemctl enable --now lumi-server lumi-expo
systemctl --no-pager --lines=0 status lumi-server lumi-expo
