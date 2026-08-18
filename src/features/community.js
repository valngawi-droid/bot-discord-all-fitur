// ==========================================
// Fitur komunitas — XP, saran, giveaway, AFK,
// log, autorole, verifikasi, starboard
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../lib/db");
const { isAdmin, deny } = require("../lib/permissions");
const { COLORS, embed, respond, formatDuration, takeCooldown } = require("../lib/util");

function DEFAULTS() {
  return {
    leveling: {
      enabled: true,
      xpMin: 15,
      xpMax: 25,
      cooldownSec: 60,
      levelChannelId: null,
      announce: true,
    },
    autoroleId: null,
    suggestChannelId: null,
    logChannelId: null,
    logEvents: { join: true, leave: true, messageDelete: true, messageEdit: false },
    starboard: { enabled: false, channelId: null, emoji: "⭐", min: 3 },
    verify: {
      enabled: false,
      roleId: null,
      title: "Verifikasi",
      message: "Klik tombol di bawah untuk verifikasi dan akses server.",
    },
  };
}

function getConfig(guildId) {
  const cfg = db.guildBucket("community", guildId, DEFAULTS);
  const d = DEFAULTS();
  if (!cfg.leveling) cfg.leveling = d.leveling;
  if (!cfg.logEvents) cfg.logEvents = d.logEvents;
  if (!cfg.starboard) cfg.starboard = d.starboard;
  if (!cfg.verify) cfg.verify = d.verify;
  return cfg;
}

function saveConfig(guildId, cfg) {
  db.saveGuild("community", guildId, cfg);
  return cfg;
}

function levelsData(guildId) {
  return db.guildBucket("levels", guildId, () => ({ users: {} }));
}

function saveLevels(guildId, data) {
  db.saveGuild("levels", guildId, data);
}

function xpForLevel(level) {
  return Math.floor(80 * level * level + 80 * level);
}

function levelFromXp(xp) {
  let lvl = 0;
  while (xp >= xpForLevel(lvl + 1) && lvl < 200) lvl += 1;
  return lvl;
}

function getUserLevel(guildId, userId) {
  const data = levelsData(guildId);
  if (!data.users[userId]) data.users[userId] = { xp: 0, level: 0 };
  return data.users[userId];
}

async function addXp(message) {
  const cfg = getConfig(message.guild.id);
  if (!cfg.leveling?.enabled || message.author.bot) return;
  const wait = takeCooldown(`xp:${message.guild.id}:${message.author.id}`, (cfg.leveling.cooldownSec || 60) * 1000);
  if (wait) return;
  const data = levelsData(message.guild.id);
  const u = data.users[message.author.id] || { xp: 0, level: 0 };
  const gain =
    (cfg.leveling.xpMin || 15) +
    Math.floor(Math.random() * Math.max(1, (cfg.leveling.xpMax || 25) - (cfg.leveling.xpMin || 15) + 1));
  u.xp += gain;
  const next = levelFromXp(u.xp);
  const leveled = next > (u.level || 0);
  u.level = next;
  data.users[message.author.id] = u;
  saveLevels(message.guild.id, data);
  if (leveled && cfg.leveling.announce) {
    const ch =
      (cfg.leveling.levelChannelId && message.guild.channels.cache.get(cfg.leveling.levelChannelId)) ||
      message.channel;
    if (ch && ch.isTextBased()) {
      ch.send({
        embeds: [
          embed({
            color: COLORS.gold,
            title: "✨ Level up!",
            description: `${message.author} naik ke **level ${next}**!`,
          }),
        ],
      }).catch(() => {});
    }
  }
}

function topLevels(guildId, limit = 10) {
  const data = levelsData(guildId);
  return Object.entries(data.users)
    .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
    .slice(0, limit)
    .map(([id, u], i) => ({ id, xp: u.xp || 0, level: u.level || 0, rank: i + 1 }));
}

async function handleRank(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const u = getUserLevel(interaction.guildId, user.id);
  const cur = xpForLevel(u.level);
  const nxt = xpForLevel((u.level || 0) + 1);
  const into = Math.max(0, (u.xp || 0) - cur);
  const need = Math.max(1, nxt - cur);
  const barLen = 12;
  const filled = Math.round((into / need) * barLen);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
  const rank = topLevels(interaction.guildId, 500).find((x) => x.id === user.id)?.rank || "—";
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: `🏅 Rank ${user.username}`,
        thumbnail: user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: "Level", value: `**${u.level || 0}**`, inline: true },
          { name: "XP", value: `${u.xp || 0}`, inline: true },
          { name: "Peringkat", value: `#${rank}`, inline: true },
          { name: "Progress", value: `\`${bar}\` ${into}/${need}` },
        ],
      }),
    ],
  });
}

async function handleLevels(interaction) {
  const top = topLevels(interaction.guildId, 10);
  if (!top.length) return respond(interaction, { content: "Belum ada XP. Ngobrol dulu di server!" });
  const lines = top.map((t) => `**#${t.rank}** <@${t.id}> — Lv **${t.level}** · ${t.xp} XP`);
  return respond(interaction, {
    embeds: [embed({ color: COLORS.gold, title: "🏆 Leaderboard XP", description: lines.join("\n") })],
  });
}

// ----- AFK -----
function afkAll() {
  return db.load("afk", {});
}

function setAfk(guildId, userId, reason) {
  const all = afkAll();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][userId] = { reason: reason || "AFK", since: Date.now() };
  db.save("afk", all);
}

function clearAfk(guildId, userId) {
  const all = afkAll();
  if (all[guildId] && all[guildId][userId]) {
    const prev = all[guildId][userId];
    delete all[guildId][userId];
    db.save("afk", all);
    return prev;
  }
  return null;
}

function getAfk(guildId, userId) {
  return afkAll()[guildId]?.[userId] || null;
}

async function handleAfk(interaction) {
  const reason = interaction.options.getString("alasan") || "AFK";
  setAfk(interaction.guildId, interaction.user.id, reason);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.orange,
        title: "💤 AFK",
        description: `${interaction.user} sekarang AFK: **${reason}**`,
      }),
    ],
  });
}

async function processAfkMessage(message) {
  if (!message.guild || message.author.bot) return;
  const cleared = clearAfk(message.guild.id, message.author.id);
  if (cleared) {
    message.channel
      .send({
        embeds: [
          embed({
            color: COLORS.green,
            description: `Selamat datang kembali ${message.author}! AFK dilepas setelah **${formatDuration(Date.now() - cleared.since)}**.`,
          }),
        ],
      })
      .catch(() => {});
  }
  const mentioned = message.mentions.users;
  if (!mentioned.size) return;
  const notes = [];
  for (const user of mentioned.values()) {
    const a = getAfk(message.guild.id, user.id);
    if (a) notes.push(`**${user.username}** AFK: ${a.reason} · <t:${Math.floor(a.since / 1000)}:R>`);
  }
  if (notes.length) {
    message.reply({ embeds: [embed({ color: COLORS.orange, title: "💤 User sedang AFK", description: notes.join("\n") })] }).catch(() => {});
  }
}

// ----- Suggest -----
async function handleSuggest(interaction) {
  const cfg = getConfig(interaction.guildId);
  const text = interaction.options.getString("pesan");
  const channel =
    (cfg.suggestChannelId && interaction.guild.channels.cache.get(cfg.suggestChannelId)) ||
    interaction.channel;
  if (!channel?.isTextBased()) {
    return respond(interaction, { content: "❌ Channel saran tidak valid.", ephemeral: true });
  }
  const msg = await channel.send({
    embeds: [
      embed({
        color: COLORS.blurple,
        title: "💡 Saran",
        description: text,
        author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() },
        footer: "0 setuju · 0 tidak",
      }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sug_up").setLabel("0").setEmoji("👍").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("sug_down").setLabel("0").setEmoji("👎").setStyle(ButtonStyle.Danger)
      ),
    ],
  });
  const box = db.load("suggestions", {});
  box[msg.id] = { up: [], down: [], guildId: interaction.guildId, userId: interaction.user.id };
  db.save("suggestions", box);
  if (channel.id !== interaction.channelId) {
    return respond(interaction, { content: `✅ Saran dikirim ke ${channel}`, ephemeral: true });
  }
  return respond(interaction, { content: "✅ Saran diposting.", ephemeral: true });
}

async function handleSuggestButton(interaction) {
  const box = db.load("suggestions", {});
  const rec = box[interaction.message.id];
  if (!rec) return interaction.reply({ content: "Saran ini sudah tidak aktif.", ephemeral: true });
  const uid = interaction.user.id;
  rec.up = rec.up.filter((id) => id !== uid);
  rec.down = rec.down.filter((id) => id !== uid);
  if (interaction.customId === "sug_up") rec.up.push(uid);
  else rec.down.push(uid);
  db.save("suggestions", box);
  const old = interaction.message.embeds[0];
  const e = embed({
    color: COLORS.blurple,
    title: old.title,
    description: old.description,
    author: old.author ? { name: old.author.name, iconURL: old.author.iconURL } : undefined,
    footer: `${rec.up.length} setuju · ${rec.down.length} tidak`,
  });
  await interaction.update({
    embeds: [e],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sug_up").setLabel(String(rec.up.length)).setEmoji("👍").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("sug_down").setLabel(String(rec.down.length)).setEmoji("👎").setStyle(ButtonStyle.Danger)
      ),
    ],
  });
}

// ----- Giveaway -----
function parseDuration(str) {
  const m = String(str || "").trim().match(/^(\d+)\s*(s|m|h|d|detik|menit|jam|hari)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = (m[2] || "m").toLowerCase();
  const mult = { s: 1000, detik: 1000, m: 60000, menit: 60000, h: 3600000, jam: 3600000, d: 86400000, hari: 86400000 };
  return n * (mult[u] || 60000);
}

function giveaways() {
  return db.load("giveaways", {});
}

function saveGiveaways(data) {
  db.save("giveaways", data);
}

async function handleGiveaway(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "start") {
    if (!isAdmin(interaction)) return deny(interaction);
    const dur = parseDuration(interaction.options.getString("durasi"));
    if (!dur || dur < 10000 || dur > 14 * 86400000) {
      return respond(interaction, { content: "❌ Durasi tidak valid. Contoh: `10m` `2h` `1d`", ephemeral: true });
    }
    const winners = interaction.options.getInteger("pemenang") || 1;
    const prize = interaction.options.getString("hadiah");
    const ends = Date.now() + dur;
    const msg = await interaction.channel.send({
      embeds: [
        embed({
          color: COLORS.gold,
          title: "🎉 GIVEAWAY",
          description: `Hadiah: **${prize}**\nBerakhir: <t:${Math.floor(ends / 1000)}:R>\nPemenang: **${winners}**\nKlik 🎉 untuk ikut!`,
          footer: `Host: ${interaction.user.tag}`,
        }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("gw_join").setLabel("Ikut (0)").setEmoji("🎉").setStyle(ButtonStyle.Primary)
        ),
      ],
    });
    const all = giveaways();
    all[msg.id] = {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      prize,
      winners,
      ends,
      host: interaction.user.id,
      users: [],
    };
    saveGiveaways(all);
    scheduleGiveaway(interaction.client, msg.id);
    return respond(interaction, { content: "✅ Giveaway dimulai.", ephemeral: true });
  }
  if (sub === "end") {
    if (!isAdmin(interaction)) return deny(interaction);
    const id = interaction.options.getString("pesan_id");
    await finishGiveaway(interaction.client, id, true);
    return respond(interaction, { content: "✅ Giveaway diakhiri.", ephemeral: true });
  }
}

async function handleGiveawayButton(interaction) {
  const all = giveaways();
  const g = all[interaction.message.id];
  if (!g || Date.now() > g.ends) {
    return interaction.reply({ content: "Giveaway sudah berakhir.", ephemeral: true });
  }
  if (g.users.includes(interaction.user.id)) {
    g.users = g.users.filter((id) => id !== interaction.user.id);
    saveGiveaways(all);
    await interaction.update({
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("gw_join").setLabel(`Ikut (${g.users.length})`).setEmoji("🎉").setStyle(ButtonStyle.Primary)
        ),
      ],
    });
    return;
  }
  g.users.push(interaction.user.id);
  saveGiveaways(all);
  await interaction.update({
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("gw_join").setLabel(`Ikut (${g.users.length})`).setEmoji("🎉").setStyle(ButtonStyle.Primary)
      ),
    ],
  });
}

async function finishGiveaway(client, messageId, announce) {
  const all = giveaways();
  const g = all[messageId];
  if (!g) return;
  delete all[messageId];
  saveGiveaways(all);
  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  if (!channel) return;
  const pool = [...g.users];
  const picked = [];
  while (picked.length < g.winners && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  const text = picked.length
    ? `Pemenang: ${picked.map((id) => `<@${id}>`).join(", ")}`
    : "Tidak ada yang ikut.";
  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (msg) {
    await msg.edit({
      embeds: [
        embed({
          color: COLORS.green,
          title: "🎉 GIVEAWAY SELESAI",
          description: `Hadiah: **${g.prize}**\n${text}`,
        }),
      ],
      components: [],
    }).catch(() => {});
  }
  if (announce !== false) {
    await channel.send(`🎉 Giveaway **${g.prize}** selesai! ${text}`).catch(() => {});
  }
}

const gwTimers = new Map();
function scheduleGiveaway(client, id) {
  if (gwTimers.has(id)) clearTimeout(gwTimers.get(id));
  const g = giveaways()[id];
  if (!g) return;
  const wait = Math.max(1000, g.ends - Date.now());
  const t = setTimeout(() => finishGiveaway(client, id), wait);
  if (t.unref) t.unref();
  gwTimers.set(id, t);
}

function resumeGiveaways(client) {
  const all = giveaways();
  for (const id of Object.keys(all)) scheduleGiveaway(client, id);
}

// ----- Announce -----
async function handleAnnounce(interaction) {
  if (!isAdmin(interaction)) return deny(interaction);
  const pesan = interaction.options.getString("pesan");
  const judul = interaction.options.getString("judul") || "📢 Pengumuman";
  const ch = interaction.options.getChannel("channel") || interaction.channel;
  await ch.send({
    embeds: [embed({ color: COLORS.violet || 0xa78bfa, title: judul, description: pesan, footer: "X Community" })],
  });
  return respond(interaction, { content: `✅ Pengumuman dikirim ke ${ch}`, ephemeral: true });
}

// ----- Verify -----
async function postVerifyPanel(channel, cfg) {
  return channel.send({
    embeds: [
      embed({
        color: COLORS.green,
        title: cfg.verify.title || "Verifikasi",
        description: cfg.verify.message,
        footer: "X Community",
      }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("verify_ok").setLabel("Verifikasi").setEmoji("✅").setStyle(ButtonStyle.Success)
      ),
    ],
  });
}

async function handleVerify(interaction) {
  if (!isAdmin(interaction)) return deny(interaction);
  const cfg = getConfig(interaction.guildId);
  const role = interaction.options.getRole("role");
  if (role) {
    cfg.verify.roleId = role.id;
    cfg.verify.enabled = true;
    saveConfig(interaction.guildId, cfg);
  }
  if (!cfg.verify.roleId) {
    return respond(interaction, { content: "❌ Atur role verifikasi dulu.", ephemeral: true });
  }
  await postVerifyPanel(interaction.channel, cfg);
  return respond(interaction, { content: "✅ Panel verifikasi dipasang.", ephemeral: true });
}

async function handleVerifyButton(interaction) {
  const cfg = getConfig(interaction.guildId);
  if (!cfg.verify.roleId) {
    return interaction.reply({ content: "Role verifikasi belum diatur.", ephemeral: true });
  }
  const role = interaction.guild.roles.cache.get(cfg.verify.roleId);
  if (!role) return interaction.reply({ content: "Role tidak ditemukan.", ephemeral: true });
  const me = interaction.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) {
    return interaction.reply({ content: "Bot tidak bisa memberikan role itu.", ephemeral: true });
  }
  if (interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({ content: "Kamu sudah terverifikasi.", ephemeral: true });
  }
  await interaction.member.roles.add(role);
  return interaction.reply({ content: "✅ Terverifikasi! Selamat datang di komunitas.", ephemeral: true });
}

// ----- Autorole + logs -----
async function handleJoinExtras(member) {
  const cfg = getConfig(member.guild.id);
  if (cfg.autoroleId) {
    const role = member.guild.roles.cache.get(cfg.autoroleId);
    if (role) await member.roles.add(role).catch(() => {});
  }
  if (cfg.logChannelId && cfg.logEvents?.join) {
    await sendLog(member.guild, {
      title: "📥 Member join",
      description: `${member.user} (${member.user.tag})`,
      color: COLORS.green,
    });
  }
}

async function handleLeaveExtras(member) {
  const cfg = getConfig(member.guild.id);
  if (cfg.logChannelId && cfg.logEvents?.leave) {
    const tag = member.user?.tag || member.id;
    await sendLog(member.guild, {
      title: "📤 Member leave",
      description: `**${tag}** keluar.`,
      color: COLORS.red,
    });
  }
}

async function sendLog(guild, { title, description, color }) {
  const cfg = getConfig(guild.id);
  if (!cfg.logChannelId) return;
  const ch = guild.channels.cache.get(cfg.logChannelId);
  if (!ch?.isTextBased()) return;
  await ch.send({ embeds: [embed({ color: color || COLORS.blurple, title, description })] }).catch(() => {});
}

async function handleMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const cfg = getConfig(message.guild.id);
  if (!cfg.logEvents?.messageDelete) return;
  await sendLog(message.guild, {
    title: "🗑️ Pesan dihapus",
    description: `**${message.author?.tag || "Unknown"}** di ${message.channel}\n${(message.content || "").slice(0, 800) || "_embed/attachment_"}`,
    color: COLORS.red,
  });
}

async function handleMessageEdit(oldM, newM) {
  if (!newM.guild || newM.author?.bot) return;
  if (oldM.content === newM.content) return;
  const cfg = getConfig(newM.guild.id);
  if (!cfg.logEvents?.messageEdit) return;
  await sendLog(newM.guild, {
    title: "✏️ Pesan diedit",
    description: `**${newM.author.tag}** di ${newM.channel}\n**Sebelum:** ${(oldM.content || "").slice(0, 400)}\n**Sesudah:** ${(newM.content || "").slice(0, 400)}`,
    color: COLORS.orange,
  });
}

async function handleStar(reaction, user) {
  if (user.bot) return;
  const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!message?.guild) return;
  const cfg = getConfig(message.guild.id);
  if (!cfg.starboard?.enabled || !cfg.starboard.channelId) return;
  const emoji = cfg.starboard.emoji || "⭐";
  if (reaction.emoji.name !== emoji && reaction.emoji.toString() !== emoji) return;
  if (reaction.count < (cfg.starboard.min || 3)) return;
  const ch = message.guild.channels.cache.get(cfg.starboard.channelId);
  if (!ch?.isTextBased()) return;
  const board = db.load("starboard", {});
  if (board[message.id]) return;
  const sent = await ch.send({
    content: `${emoji} **${reaction.count}** · ${message.channel}`,
    embeds: [
      embed({
        color: COLORS.gold,
        description: message.content || undefined,
        author: { name: message.author?.tag || "Unknown", iconURL: message.author?.displayAvatarURL() },
        image: message.attachments.first()?.url,
        footer: message.id,
      }),
    ],
  }).catch(() => null);
  if (sent) {
    board[message.id] = sent.id;
    db.save("starboard", board);
  }
}

async function handleMessage(message) {
  await addXp(message);
  await processAfkMessage(message);
}

module.exports = {
  getConfig,
  saveConfig,
  handleRank,
  handleLevels,
  handleAfk,
  handleSuggest,
  handleSuggestButton,
  handleGiveaway,
  handleGiveawayButton,
  handleAnnounce,
  handleVerify,
  handleVerifyButton,
  handleJoinExtras,
  handleLeaveExtras,
  handleMessageDelete,
  handleMessageEdit,
  handleStar,
  handleMessage,
  resumeGiveaways,
  postVerifyPanel,
  topLevels,
};
