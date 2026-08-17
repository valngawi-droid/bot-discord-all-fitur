// ==========================================
// Welcome & Goodbye
// ==========================================
const db = require("../lib/db");
const { isAdmin, deny } = require("../lib/permissions");
const { COLORS, embed, respond, parseColor } = require("../lib/util");

const DEFAULTS = () => ({
  welcome: {
    enabled: false,
    channelId: null,
    message:
      "Halo {user.mention}, selamat datang di **{server}**!\nKamu member ke-**{membercount}**. Semoga betah ya 💚",
    color: "00d9a5",
  },
  goodbye: {
    enabled: false,
    channelId: null,
    message: "**{user.tag}** telah keluar dari **{server}**.\nSekarang ada **{membercount}** member.",
    color: "ff8c42",
  },
});

function getConfig(guildId) {
  const cfg = db.guildBucket("welcome", guildId, DEFAULTS);
  if (!cfg.welcome) Object.assign(cfg, DEFAULTS());
  return cfg;
}

function saveConfig(guildId, cfg) {
  db.saveGuild("welcome", guildId, cfg);
}

function formatMessage(template, member) {
  const user = member.user || member;
  const guild = member.guild;
  const count = guild?.memberCount ?? "?";
  return String(template || "")
    .replace(/\{user\.mention\}/g, `<@${user.id}>`)
    .replace(/\{user\.tag\}/g, user.tag || user.username)
    .replace(/\{user\}/g, user.username)
    .replace(/\{server\}/g, guild?.name || "server")
    .replace(/\{membercount\}/g, String(count));
}

function buildCard(kind, cfgPart, member) {
  const isWelcome = kind === "welcome";
  const user = member.user || member;
  return embed({
    color: parseColor(cfgPart.color, isWelcome ? COLORS.teal : COLORS.orange),
    title: isWelcome ? "👋 Selamat Datang!" : "👋 Selamat Tinggal",
    description: formatMessage(cfgPart.message, member),
    thumbnail: user.displayAvatarURL?.({ size: 256 }) || undefined,
    footer: member.guild ? member.guild.name : undefined,
    author: {
      name: user.tag || user.username,
      iconURL: user.displayAvatarURL?.({ size: 64 }),
    },
  });
}

async function sendCard(guild, kind, member) {
  const cfg = getConfig(guild.id);
  const part = cfg[kind];
  if (!part?.enabled || !part.channelId) return;
  const channel = guild.channels.cache.get(part.channelId);
  if (!channel || !channel.isTextBased()) return;
  try {
    await channel.send({
      content: kind === "welcome" ? `${member}` : undefined,
      embeds: [buildCard(kind, part, member)],
    });
  } catch (err) {
    console.error(`⚠️  Gagal kirim ${kind}:`, err.message);
  }
}

async function handleJoin(member) {
  await sendCard(member.guild, "welcome", member);
}

async function handleLeave(member) {
  await sendCard(member.guild, "goodbye", member);
}

async function handleWelcome(interaction) {
  return handleKind(interaction, "welcome");
}

async function handleGoodbye(interaction) {
  return handleKind(interaction, "goodbye");
}

async function handleKind(interaction, kind) {
  if (!interaction.guild) {
    return respond(interaction, { content: "❌ Command ini hanya untuk server.", ephemeral: true });
  }
  if (!isAdmin(interaction)) return deny(interaction);
  const sub = interaction.options.getSubcommand();
  const cfg = getConfig(interaction.guildId);
  const part = cfg[kind];
  const label = kind === "welcome" ? "Welcome" : "Goodbye";

  if (sub === "channel") {
    const ch = interaction.options.getChannel("channel");
    if (!ch.isTextBased()) {
      return respond(interaction, { content: "❌ Pilih text channel.", ephemeral: true });
    }
    part.channelId = ch.id;
    part.enabled = true;
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      content: `✅ Channel ${label.toLowerCase()} diatur ke ${ch} dan fitur **diaktifkan**.`,
      ephemeral: true,
    });
  }

  if (sub === "pesan") {
    part.message = interaction.options.getString("teks");
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      content:
        `✅ Pesan ${label.toLowerCase()} disimpan.\nPlaceholder: \`{user}\` \`{user.tag}\` \`{user.mention}\` \`{server}\` \`{membercount}\``,
      ephemeral: true,
    });
  }

  if (sub === "warna") {
    const hex = interaction.options.getString("hex").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return respond(interaction, { content: "❌ Warna harus hex 6 digit, contoh `00d9a5`.", ephemeral: true });
    }
    part.color = hex;
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, { content: `✅ Warna ${label.toLowerCase()}: \`#${hex}\``, ephemeral: true });
  }

  if (sub === "on" || sub === "off") {
    part.enabled = sub === "on";
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      content: `${part.enabled ? "✅" : "⏸️"} ${label} **${part.enabled ? "aktif" : "nonaktif"}**.`,
      ephemeral: true,
    });
  }

  if (sub === "test") {
    if (!part.channelId) {
      return respond(interaction, {
        content: `❌ Channel ${label.toLowerCase()} belum diatur.`,
        ephemeral: true,
      });
    }
    await sendCard(interaction.guild, kind, interaction.member);
    return respond(interaction, { content: `✅ Contoh ${label.toLowerCase()} dikirim.`, ephemeral: true });
  }
}

module.exports = {
  getConfig,
  saveConfig,
  handleWelcome,
  handleGoodbye,
  handleJoin,
  handleLeave,
};
