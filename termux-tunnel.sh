#!/data/data/com.termux/files/usr/bin/bash
# ==========================================
# Tes X Community di Termux + Cloudflare tunnel
#   bash termux-tunnel.sh
# ==========================================
set -e
cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════╗"
echo "║  X Community — Termux + tunnel           ║"
echo "╚══════════════════════════════════════════╝"

pkg install -y nodejs-lts git cloudflared >/dev/null

if [ ! -d node_modules ]; then
  echo "📦 npm install..."
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  File .env baru dibuat. Isi BOT_TOKEN dan CLIENT_ID:"
  echo "    nano .env"
  exit 1
fi

if grep -q "TOKEN_BOT_DISCORD_KAMU" .env && ! grep -qE "^BOT_TOKEN=.+" .env | grep -vq TOKEN_BOT; then
  echo "⚠️  Isi BOT_TOKEN di .env dulu: nano .env"
fi

export WEB_PORT="${WEB_PORT:-3000}"

echo ""
echo "🚀 Menjalankan bot + website di port $WEB_PORT"
echo "   Tunnel akan muncul URL https://....trycloudflare.com"
echo "   Buka URL itu di browser HP."
echo ""

# Jalankan app di background
node index.js &
APP_PID=$!
sleep 3

cleanup() {
  kill $APP_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Tunnel publik ke website
cloudflared tunnel --url "http://127.0.0.1:${WEB_PORT}"
