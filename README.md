# 🦖 Bot Discord All Fitur — Panel + Store + Ticket + Games

Bot Discord lengkap: **Auto Create Panel Pterodactyl**, **Store buka/tutup**, **Ticket channel**, **Take Role**, **Welcome/Goodbye**, **mini games + ekonomi**, plus **Website Dashboard**. Siap jalan 24 jam di VPS.

## ✨ Fitur

### 🏪 Store
| Command | Fungsi |
|---|---|
| `/store buka` `/store tutup` | Pengumuman toko buka / tutup + tombol order |
| `/store status` `/store info` | Cek status, produk, payment |
| `/store restock` `/store promo` | Pengumuman restock & promo |
| `/store set-channel` `set-nama` `set-jam` `set-staff` `set-kategori` `set-owner` | Pengaturan toko |
| `/produk add\|edit\|hapus\|list` | Katalog produk |
| `/payment add\|hapus\|list` | Metode pembayaran |
| `/buy` | Pesan produk — otomatis buka ticket |

### 🎫 Ticket
| Command | Fungsi |
|---|---|
| `/ticket setup` | Pasang panel tombol (Pesanan / Support / Komplain) |
| `/ticket close` | Tutup + transcript ke DM, channel dihapus 10 detik |
| `/ticket claim` `add` `remove` `rename` | Staff kelola ticket |

Member klik tombol → bot **membuat channel privat** hanya untuk pembeli + staff.

### 🎭 Take Role
| Command | Fungsi |
|---|---|
| `/takerole panel` | Buat pesan panel |
| `/takerole add` | Tambah tombol role (ambil / lepas) |
| `/takerole hapus` `list` | Kelola panel |

### 👋 Welcome & Goodbye
| Command | Fungsi |
|---|---|
| `/welcome channel` `pesan` `warna` `on` `off` `test` | Sambutan member baru |
| `/goodbye channel` `pesan` `warna` `on` `off` `test` | Pesan saat member keluar |

Placeholder: `{user}` `{user.tag}` `{user.mention}` `{server}` `{membercount}`

### 🎮 Game & 💰 Ekonomi
`/tictactoe` `/suit` `/slot` `/dadu` `/coinflip` `/tebakangka` `/tebakkata` `/tebakbendera` `/caklontong` `/math` `/siapakahaku` `/hangman`

`/balance` `/daily` `/work` `/transfer` `/leaderboard` `/givekoin`

Kuis: klik **Tebak** atau ketik jawaban langsung di chat.

### 🦖 Auto Panel Pterodactyl
`/createpanel` `/deletepanel` `/deleteuser` `/listserver` `/listuser`

Paket: `1gb` … `10gb` + `unli`

### 🌐 Website Dashboard
- Login password admin
- Buat / hapus panel
- **Buka-tutup store**, CRUD produk & payment
- Edit pesan welcome / goodbye
- Mode demo otomatis jika API panel belum diisi

---

## 🚀 Install di VPS (Ubuntu/Debian)

```bash
git clone https://github.com/valngawi-droid/bot-discord-all-fitur.git
cd bot-discord-all-fitur
chmod +x install-vps.sh
./install-vps.sh

nano .env
npm run deploy-commands
pm2 start index.js --name ptero-panel
pm2 save && pm2 startup
```

Website: `http://IP-VPS-KAMU:3000`

## 🤖 Izin & Intent Bot

Di **Discord Developer Portal → Bot**:

1. Aktifkan **SERVER MEMBERS INTENT** (wajib untuk welcome/goodbye)
2. Aktifkan **MESSAGE CONTENT INTENT** (supaya tebak-tebakan bisa diketik di chat)
3. Invite bot dengan permission:
   - `Send Messages`, `Embed Links`, `Attach Files`
   - `Manage Channels` (buat / hapus ticket)
   - `Manage Roles` (take role — **posisi role bot harus di atas** role yang dibagikan)
   - `Read Message History`

Kalau intent belum aktif, bot tetap login (fitur welcome & tebak-ketik terbatas).

## ⚙️ Konfigurasi `.env`

| Variabel | Keterangan |
|---|---|
| `BOT_TOKEN` | Token bot |
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | ID server (command langsung aktif + data store website) |
| `OWNER_IDS` | ID owner, pisahkan koma |
| `ADMIN_ROLE_IDS` | Role admin command |
| `PTERO_URL` | URL panel, tanpa `/` di akhir |
| `PTERO_APP_KEY` | Application API Key (`ptla_...`) |
| `PTERO_EGG_ID` / `NEST_ID` / `LOCATION_ID` | Default egg/nest/lokasi |
| `WEB_PORT` | Default `3000` |
| `WEB_ADMIN_PASSWORD` | Password dashboard |

## 📋 Setup cepat toko

```
/store set-nama NamaTokoKamu
/store set-channel #pengumuman
/store set-jam buka:09:00 tutup:21:00
/store set-staff @Staff
/store set-kategori 📂 tickets
/produk add nama:Panel 2GB harga:15000 stok:10
/payment add metode:DANA nomor:08xxxx atas_nama:Budi
/ticket setup
/takerole panel
/welcome channel #welcome
/goodbye channel #goodbye
/store buka
```

## 🖥️ PM2

```bash
pm2 logs ptero-panel
pm2 restart ptero-panel
pm2 stop ptero-panel
```

## 📁 Struktur

```
├── index.js                 # Bot + website
├── src/
│   ├── bot.js               # Router event Discord
│   ├── deploy-commands.js   # Slash commands
│   ├── pterodactyl.js       # API panel
│   ├── features/            # store, ticket, takerole, welcome, games, ekonomi
│   ├── lib/                 # db JSON, izin, util
│   └── web/                 # Dashboard Express
└── data/                    # Data persist (store, ticket, ekonomi) — tidak di-commit
```

## ⚠️ Catatan
- Jangan bagikan `BOT_TOKEN` dan `PTERO_APP_KEY`.
- Command admin: owner, role admin, atau Administrator server.
- `/store status`, `/produk list`, game, dan ekonomi bisa dipakai semua member.
- Gunakan secara bertanggung jawab, hanya pada panel milikmu sendiri.
