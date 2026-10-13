#!/usr/bin/env bash
# Daily snapshot of server/data (SQLite DB + question images) into ~/backups, keeping the newest 7.
# The DB is copied with SQLite's online backup, so it is consistent while the server is running.
set -euo pipefail
umask 077

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${DATA_DIR:-$REPO/server/data}"
DEST="${BACKUP_DIR:-$HOME/backups}"
KEEP=7
OUT="$DEST/lumi-data-$(date +%F).tar.gz"

mkdir -p "$DEST"
[ -d "$DATA" ] || { echo "$(date -Is) no data dir at $DATA, nothing to back up"; exit 0; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/data"

# Everything except the live DB files, then a consistent copy of the DB itself.
tar -C "$DATA" --exclude='./derece.db' --exclude='./derece.db-wal' --exclude='./derece.db-shm' -cf - . \
  | tar -C "$tmp/data" -xf -
if [ -f "$DATA/derece.db" ]; then
  sqlite3 "$DATA/derece.db" ".backup '$tmp/data/derece.db'"
  [ "$(sqlite3 "$tmp/data/derece.db" 'PRAGMA integrity_check;')" = ok ] || { echo "integrity check failed" >&2; exit 1; }
fi

tar -C "$tmp" -czf "$OUT.part" data
mv "$OUT.part" "$OUT"

ls -1t "$DEST"/lumi-data-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "$(date -Is) wrote $OUT ($(du -h "$OUT" | cut -f1))"
