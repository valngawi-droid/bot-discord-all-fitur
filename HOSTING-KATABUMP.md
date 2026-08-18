# Hosting X Community di KataBump

Panel: [https://control.katabump.com/](https://control.katabump.com/)  
Docs: [https://docs.katabump.com/](https://docs.katabump.com/)

KataBump = hosting bot Node.js (Pterodactyl). Bot Discord jalan 24/7. Dashboard website hanya kebuka di internet kalau server punya **port allocation** di tab Network.

## 1. Buat server

1. Login [katabump.com](https://katabump.com/en/) → Order server **Node.js** (18.x atau 20.x LTS)
2. Tunggu 2–5 menit, buka **Access Server**
3. Salin Identifier + password, lalu masuk [control.katabump.com](https://control.katabump.com/)

## 2. Upload file

**Cara A — Git (paling mudah)**  
Di tab **Console** server (setelah Start sekali, atau lewat file manager terminal):

```bash
git clone -b arena/01a0120b-bot-discord-all-fitur https://github.com/valngawi-droid/bot-discord-all-fitur.git .
```

Kalau folder tidak kosong, hapus file default egg dulu, atau clone ke subfolder lalu pindahkan isinya ke `/home/container`.

**Cara B — ZIP**  
1. Tab **Files** → Upload `x-community-katabump.zip`  
2. Klik kanan → **Unarchive / Extract**  
3. Pastikan `index.js` dan `package.json` ada di root (`/home/container`), bukan di dalam subfolder

Jangan upload folder `node_modules`. KataBump menjalankan `npm install` sendiri saat start.

## 3. Startup

Tab **Startup**:

| Variabel | Isi |
|---|---|
| **JS FILE** | `index.js` |
| Node.js | **18** atau **20** LTS |

Kalau ada field `CMD_RUN` / start command, isi: `node index.js`

## 4. Environment / file `.env`

Tab **Files** → New File → nama `.env`:

```env
BOT_TOKEN=token_bot_kamu
CLIENT_ID=application_id_bot
GUILD_ID=id_server_discord
OWNER_IDS=id_discord_kamu
ADMIN_ROLE_IDS=
WEB_ADMIN_PASSWORD=ganti_password_dashboard
```

Atau isi variabel yang sama di tab **Startup** (tanpa spasi di ujung nilai).

Token juga diterima sebagai `DISCORD_TOKEN` (nama default KataBump).

## 5. Intent Discord

Developer Portal → Bot → nyalakan:

- SERVER MEMBERS INTENT  
- MESSAGE CONTENT INTENT  

Invite bot dengan izin: Send Messages, Embed Links, Attach Files, Manage Channels, Manage Roles, Read Message History, Add Reactions.

## 6. Daftar slash command + Start

Di **Console**, setelah file dan `.env` siap:

```bash
npm install
node src/deploy-commands.js
```

Lalu tab Console → **Start**. Log yang benar:

```
X Community
Website X Community dashboard: http://0.0.0.0:XXXX
Bot login sebagai NamaBot#1234
```

## 7. Dashboard website

- Port otomatis memakai `SERVER_PORT` dari KataBump.
- Cek tab **Network** — kalau ada IP:port publik, buka `http://IP:PORT` (password = `WEB_ADMIN_PASSWORD`).
- Paket gratis sering **tidak** mem-publish port web. Bot tetap hidup; atur fitur lewat slash command di Discord (`/welcome`, `/store`, `/ticket`, `/help`).

## 8. Perpanjang server

Paket gratis harus di-renew tiap **4 hari**. Kalau tidak, server dihapus beserta file.

## Masalah umum

| Gejala | Perbaikan |
|---|---|
| Invalid token | Cek `BOT_TOKEN` / `DISCORD_TOKEN`, restart |
| Module not found | Pastikan `package.json` di root, restart agar `npm install` jalan |
| Command slash tidak muncul | Jalankan `node src/deploy-commands.js`, isi `CLIENT_ID` + `GUILD_ID` |
| Welcome tidak jalan | Nyalakan Server Members Intent |
| Restart berulang | Baca log Console, biasanya token / syntax |
