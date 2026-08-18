# X Community

Bot Discord + **website dashboard** untuk komunitas. Setup semuanya dari web — welcome banner, store, ticket, take role, XP, saran, giveaway — tanpa harus hafal slash command.

Nama website **X Community** terkunci. Yang boleh diganti hanya **nama bot**.

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
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | ID server (wajib agar dashboard tahu channel/role) |
| `OWNER_IDS` | ID owner |
| `ADMIN_ROLE_IDS` | Role admin command |
| `WEB_PORT` | Default 3000 |
| `WEB_ADMIN_PASSWORD` | Password dashboard |

## Catatan
- Nama website tidak bisa diubah dari pengaturan.
- Nama bot di halaman Pengaturan jadi nickname bot di server.
- Jangan bagikan `BOT_TOKEN`.
