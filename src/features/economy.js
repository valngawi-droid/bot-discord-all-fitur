// ==========================================
// Ekonomi mini — koin, daily, work, transfer
// ==========================================
const db = require("../lib/db");
const { isAdmin, deny } = require("../lib/permissions");
const { COLORS, coins, embed, respond, pick, formatDuration } = require("../lib/util");

const DAILY_MS = 24 * 60 * 60 * 1000;
const WORK_MS = 60 * 60 * 1000;

const JOBS = [
  ["Mengantar paket", 90, 180],
  ["Jualan di marketplace", 120, 260],
  ["Nge-farm di Minecraft", 80, 200],
  ["Jadi admin grup WA", 70, 150],
  ["Streaming game", 150, 320],
  ["Nulis script bot", 180, 350],
  ["Bantu restock toko", 100, 220],
  ["Jadi kurir makanan", 85, 190],
  ["Desain banner Discord", 140, 280],
  ["Push rank bareng customer", 110, 240],
];

function bucket(guildId) {
  return db.guildBucket("economy", guildId, () => ({ users: {} }));
}

function save(guildId, data) {
  db.saveGuild("economy", guildId, data);
}

function getUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = { coins: 0, lastDaily: 0, lastWork: 0, won: 0, lost: 0 };
  }
  return data.users[userId];
}

function addCoins(guildId, userId, amount) {
  const data = bucket(guildId);
  const u = getUser(data, userId);
  u.coins = Math.max(0, (u.coins || 0) + amount);
  save(guildId, data);
  return u.coins;
}

function getBal(guildId, userId) {
  const data = bucket(guildId);
  return getUser(data, userId).coins || 0;
}

function needGuild(interaction) {
  if (interaction.guildId) return false;
  respond(interaction, { content: "❌ Command ini hanya untuk server.", ephemeral: true });
  return true;
}

async function handleBalance(interaction) {
  if (needGuild(interaction)) return;
  const user = interaction.options.getUser("user") || interaction.user;
  const data = bucket(interaction.guildId);
  const u = getUser(data, user.id);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: `💰 Dompet ${user.username}`,
        thumbnail: user.displayAvatarURL({ size: 128 }),
        fields: [
          { name: "Saldo", value: coins(u.coins), inline: true },
          { name: "Menang game", value: String(u.won || 0), inline: true },
          { name: "Kalah game", value: String(u.lost || 0), inline: true },
        ],
      }),
    ],
  });
}

async function handleDaily(interaction) {
  if (needGuild(interaction)) return;
  const data = bucket(interaction.guildId);
  const u = getUser(data, interaction.user.id);
  const now = Date.now();
  if (now - (u.lastDaily || 0) < DAILY_MS) {
    const left = DAILY_MS - (now - u.lastDaily);
    return respond(interaction, {
      content: `⏳ Daily sudah diambil. Coba lagi dalam **${formatDuration(left)}**.`,
      ephemeral: true,
    });
  }
  const gain = 500 + Math.floor(Math.random() * 1001);
  u.lastDaily = now;
  u.coins += gain;
  save(interaction.guildId, data);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.green,
        title: "📅 Daily Claim",
        description: `Kamu menerima **${coins(gain)}**!\nSaldo sekarang: **${coins(u.coins)}**`,
      }),
    ],
  });
}

async function handleWork(interaction) {
  if (needGuild(interaction)) return;
  const data = bucket(interaction.guildId);
  const u = getUser(data, interaction.user.id);
  const now = Date.now();
  if (now - (u.lastWork || 0) < WORK_MS) {
    const left = WORK_MS - (now - u.lastWork);
    return respond(interaction, {
      content: `💼 Masih capek. Kerja lagi dalam **${formatDuration(left)}**.`,
      ephemeral: true,
    });
  }
  const [job, min, max] = pick(JOBS);
  const gain = min + Math.floor(Math.random() * (max - min + 1));
  u.lastWork = now;
  u.coins += gain;
  save(interaction.guildId, data);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.teal,
        title: "💼 Kerja selesai",
        description: `Kamu **${job}** dan mendapat **${coins(gain)}**.\nSaldo: **${coins(u.coins)}**`,
      }),
    ],
  });
}

async function handleTransfer(interaction) {
  if (needGuild(interaction)) return;
  const target = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("jumlah");
  if (target.bot) {
    return respond(interaction, { content: "❌ Tidak bisa transfer ke bot.", ephemeral: true });
  }
  if (target.id === interaction.user.id) {
    return respond(interaction, { content: "❌ Tidak bisa transfer ke diri sendiri.", ephemeral: true });
  }
  if (amount < 10) {
    return respond(interaction, { content: "❌ Minimal transfer 10 koin.", ephemeral: true });
  }
  const data = bucket(interaction.guildId);
  const from = getUser(data, interaction.user.id);
  if (from.coins < amount) {
    return respond(interaction, {
      content: `❌ Saldo tidak cukup. Kamu punya ${coins(from.coins)}.`,
      ephemeral: true,
    });
  }
  const to = getUser(data, target.id);
  from.coins -= amount;
  to.coins += amount;
  save(interaction.guildId, data);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.green,
        title: "💸 Transfer berhasil",
        description: `${interaction.user} mengirim **${coins(amount)}** ke ${target}.`,
      }),
    ],
  });
}

async function handleLeaderboard(interaction) {
  if (needGuild(interaction)) return;
  const data = bucket(interaction.guildId);
  const top = Object.entries(data.users)
    .sort((a, b) => (b[1].coins || 0) - (a[1].coins || 0))
    .slice(0, 10);
  if (!top.length) {
    return respond(interaction, { content: "Belum ada data ekonomi. Klaim `/daily` dulu!" });
  }
  const lines = await Promise.all(
    top.map(async ([id, u], i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `\`${i + 1}.\``;
      return `${medal} <@${id}> — **${coins(u.coins)}**`;
    })
  );
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: "🏆 Leaderboard Koin",
        description: lines.join("\n"),
      }),
    ],
  });
}

async function handleGiveKoin(interaction) {
  if (!isAdmin(interaction)) return deny(interaction);
  const user = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("jumlah");
  const bal = addCoins(interaction.guildId, user.id, amount);
  return respond(interaction, {
    content: `✅ ${amount >= 0 ? "Menambah" : "Mengurangi"} ${coins(Math.abs(amount))} untuk ${user}. Saldo: **${coins(bal)}**`,
    ephemeral: true,
  });
}

function recordGame(guildId, userId, win, delta) {
  const data = bucket(guildId);
  const u = getUser(data, userId);
  if (win) u.won = (u.won || 0) + 1;
  else u.lost = (u.lost || 0) + 1;
  u.coins = Math.max(0, (u.coins || 0) + (delta || 0));
  save(guildId, data);
  return u.coins;
}

module.exports = {
  handleBalance,
  handleDaily,
  handleWork,
  handleTransfer,
  handleLeaderboard,
  handleGiveKoin,
  addCoins,
  getBal,
  recordGame,
  getUser,
  bucket,
  save,
};
