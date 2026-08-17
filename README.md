# 🦖 Ptero Auto Panel — Bot Discord + Website

Bot Discord **Auto Create Panel Pterodactyl** lengkap dengan **Website Dashboard**, siap dijalankan 24 jam di VPS.

## ✨ Fitur

### 🤖 Bot Discord (Slash Commands)
| Command | Fungsi |
|---|---|
| `/createpanel <username> <paket>` | Auto buat user + server panel, detail dikirim ke DM |
| `/deletepanel <server_id>` | Hapus server panel |
| `/deleteuser <user_id>` | Hapus user panel |
| `/listserver` | Daftar semua server |
| `/listuser` | Daftar semua user |
| `/ping` | Cek status bot |
| `/help` | Bantuan |

### 🌐 Website Dashboard
- Login dengan password admin
- Buat panel lewat form (username + paket) — hasil langsung tampil, bisa klik-untuk-salin
- Lihat & hapus server / user
- **Mode demo otomatis** jika API panel belum diisi (bisa dicoba tanpa panel asli)

### 📦 Paket Resource
`1gb` `2gb` `3gb` `4gb` `5gb` `6gb` `7gb` `8gb` `9gb` `10gb` `unli` (unlimited)

---

## 🚀 Cara Install di VPS (Ubuntu/Debian)

```bash
# 1. Clone repo
git clone https://github.com/valngawi-droid/bot-discord-all-fitur.git
cd bot-discord-all-fitur

# 2. Jalankan installer otomatis
chmod +x install-vps.sh
./install-vps.sh

# 3. Edit konfigurasi
nano .env

# 4. Daftarkan slash commands ke Discord
npm run deploy-commands

# 5. Jalankan 24 jam dengan PM2
pm2 start index.js --name ptero-panel
pm2 save && pm2 startup
```

Website bisa diakses di: `http://IP-VPS-KAMU:3000`

---

## ⚙️ Konfigurasi `.env`

| Variabel | Keterangan |
|---|---|
| `BOT_TOKEN` | Token bot dari [Discord Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID` | Application ID bot |
| `GUILD_ID` | ID server Discord (agar command langsung aktif) |
| `OWNER_IDS` | ID Discord kamu (boleh pakai semua command admin) |
| `PTERO_URL` | URL panel, contoh: `https://panel.domainkamu.com` |
| `PTERO_APP_KEY` | Application API Key (Panel → Admin → Application API, centang semua permission Read & Write) |
| `PTERO_EGG_ID` | ID egg (default: 15 = NodeJS) |
| `PTERO_NEST_ID` | ID nest (default: 5) |
| `PTERO_LOCATION_ID` | ID lokasi node (default: 1) |
| `WEB_PORT` | Port website (default: 3000) |
| `WEB_ADMIN_PASSWORD` | Password login website |

### 🔑 Cara ambil Application API Key
1. Login panel sebagai **admin**
2. Buka **Admin Area → Application API → Create New**
3. Centang semua permission **Read & Write**
4. Salin key `ptla_...` ke `.env`

---

## 🖥️ Perintah PM2 Berguna

```bash
pm2 logs ptero-panel     # lihat log
pm2 restart ptero-panel  # restart
pm2 stop ptero-panel     # stop
pm2 list                 # daftar proses
```

## 📁 Struktur Project

```
├── index.js               # Entry point (bot + website)
├── install-vps.sh         # Installer otomatis VPS
├── .env.example           # Template konfigurasi
└── src/
    ├── bot.js             # Bot Discord
    ├── deploy-commands.js # Daftar slash commands
    ├── pterodactyl.js     # API Pterodactyl
    └── web/
        ├── server.js      # Backend website (Express)
        └── public/
            └── index.html # Dashboard website
```

## ⚠️ Catatan
- Jangan bagikan `BOT_TOKEN` dan `PTERO_APP_KEY` ke siapapun!
- Hanya user di `OWNER_IDS` / role di `ADMIN_ROLE_IDS` yang bisa pakai command admin.
- Gunakan bot ini secara bertanggung jawab, hanya pada panel milikmu sendiri.
