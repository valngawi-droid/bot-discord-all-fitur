#!/bin/bash
# ==========================================
# INSTALLER OTOMATIS UNTUK VPS (Ubuntu/Debian)
# Cara pakai:
#   chmod +x install-vps.sh && ./install-vps.sh
# ==========================================
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  🦖 INSTALLER PTERO AUTO PANEL (VPS)     ║"
echo "╚══════════════════════════════════════════╝"

# 1. Update sistem
echo "📦 [1/5] Update sistem..."
sudo apt-get update -y

# 2. Install Node.js 20 jika belum ada
if ! command -v node &> /dev/null; then
  echo "📦 [2/5] Install Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ [2/5] Node.js sudah terpasang: $(node -v)"
fi

# 3. Install dependencies project
echo "📦 [3/5] Install dependencies..."
npm install

# 4. Setup file .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  [4/5] File .env dibuat dari template — WAJIB edit dulu:"
  echo "    nano .env"
else
  echo "✅ [4/5] File .env sudah ada."
fi

# 5. Install PM2 supaya jalan 24 jam
if ! command -v pm2 &> /dev/null; then
  echo "📦 [5/5] Install PM2..."
  sudo npm install -g pm2
else
  echo "✅ [5/5] PM2 sudah terpasang."
fi

echo ""
echo "══════════════════════════════════════════════"
echo "✅ INSTALASI SELESAI! Langkah selanjutnya:"
echo ""
echo "  1. Edit konfigurasi:   nano .env"
echo "  2. Daftarkan command:  npm run deploy-commands"
echo "  3. Jalankan 24 jam:    pm2 start index.js --name ptero-panel"
echo "  4. Auto-start saat reboot:"
echo "       pm2 save && pm2 startup"
echo ""
echo "  Website: http://IP-VPS-KAMU:3000"
echo "══════════════════════════════════════════════"
