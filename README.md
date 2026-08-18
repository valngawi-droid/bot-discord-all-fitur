# X Community

Bot Discord + **website dashboard** untuk komunitas. Setup semuanya dari web — welcome banner, store, ticket, take role, XP, saran, giveaway — tanpa harus hafal slash command.

Nama website **X Community** terkunci. Yang boleh diganti hanya **nama bot**.

Bot **multi-server**: invite ke banyak guild, tiap server punya store / welcome / ticket / XP sendiri. Di dashboard pilih server dari sidebar.

## Fitur

### Dashboard website
Login admin lalu atur:
- Welcome / goodbye + **banner** (Aurora, Dusk, Royal, atau URL sendiri) + preview live
- Store buka/tutup, produk, payment
- Pasang panel ticket & take role
- Komunitas: XP, autorole, saran, log, verifikasi, starboard
- Ganti nama bot (nickname)

### Discord
- Store, ticket channel privat, take role
- Welcome/goodbye ber-banner
- XP + `/rank` `/levels`
- `/suggest` vote, `/giveaway`, `/afk`, `/announce`, `/verify`, `/poll`
- Mini games + ekonomi koin

## Hosting di KataBump

Panel: [control.katabump.com](https://control.katabump.com/)

1. Buat server **Node.js 18/20**
2. Upload ZIP atau `git clone` ke `/home/container`
3. Startup → **JS FILE** = `index.js`
4. Buat file `.env` (lihat `.env.example`)
5. Console: `npm install` lalu `node src/deploy-commands.js` lalu **Start**

Panduan lengkap: [HOSTING-KATABUMP.md](./HOSTING-KATABUMP.md)

## Install

```bash
git clone https://github.com/valngawi-droid/bot-discord-all-fitur.git
cd bot-discord-all-fitur
chmod +x install-vps.sh && ./install-vps.sh
nano .env
npm run deploy-commands
pm2 start index.js --name x-community
pm2 save && pm2 startup
```

Website: `http://IP:3000` — password default `admin123`

## Intent & izin bot

Developer Portal → Bot:
- **SERVER MEMBERS INTENT**
- **MESSAGE CONTENT INTENT**

Invite dengan: Send Messages, Embed Links, Attach Files, Manage Channels, Manage Roles, Read Message History, Add Reactions.

Role bot harus **di atas** role yang dibagikan (take role / autorole / verify).

## `.env`

| Variabel | Keterangan |
|---|---|
| `BOT_TOKEN` | Token bot |
| `CLIENT_ID` | Application ID (wajib untuk invite + slash command) |
| `GUILD_ID` | Opsional. Fallback dashboard saja — bot tetap multi-server |
| `OWNER_IDS` | ID owner |
| `ADMIN_ROLE_IDS` | Role admin command |
| `WEB_PORT` | Default 3000 |
| `WEB_ADMIN_PASSWORD` | Password dashboard |

## Catatan
- Nama website tidak bisa diubah dari pengaturan.
- Nama bot di halaman Pengaturan jadi nickname bot di server.
- Jangan bagikan `BOT_TOKEN`.
