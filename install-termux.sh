#!/data/data/com.termux/files/usr/bin/bash
# ==========================================
# INSTALLER UNTUK TERMUX (Android)
# Cara pakai di Termux:
#   pkg install git -y
#   git clone https://github.com/valngawi-droid/bot-discord-all-fitur.git
#   cd bot-discord-all-fitur
#   bash install-termux.sh
# ==========================================
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  X COMMUNITY — installer Termux          ║"
echo "╚══════════════════════════════════════════╝"

echo "📦 [1/4] Update package Termux..."
pkg update -y && pkg upgrade -y

echo "📦 [2/4] Install Node.js & git..."
pkg install -y nodejs-lts git

echo "📦 [3/4] Install dependencies project..."
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  [4/4] File .env dibuat — edit dulu: nano .env"
else
  echo "✅ [4/4] File .env sudah ada."
fi

echo ""
echo "══════════════════════════════════════════════"
echo "✅ SELESAI! Langkah selanjutnya di Termux:"
echo ""
echo "  1. Edit config      : nano .env"
echo "     (isi BOT_TOKEN, CLIENT_ID, GUILD_ID)"
echo "  2. Daftar commands  : npm run deploy-commands"
echo "  3. Jalankan bot+web : npm start"
echo ""
echo "  Website: http://localhost:3000 (buka di browser HP)"
echo ""
echo "  💡 Biar Termux tidak mati di background:"
echo "     termux-wake-lock"
echo "══════════════════════════════════════════════"
