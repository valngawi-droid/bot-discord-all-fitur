// ==========================================
// Welcome & Goodbye + banner
// ==========================================
const db = require("../lib/db");
const { isAdmin, deny } = require("../lib/permissions");
const { COLORS, embed, respond, parseColor } = require("../lib/util");
const { buildBannerAttachment, listPresets } = require("./banner");

const DEFAULTS = () => ({
  welcome: {
    enabled: false,
    channelId: null,
    title: "Selamat Datang!",
    message:
      "Halo {user.mention}, selamat datang di **{server}**!\nKamu member ke-**{membercount}**. Semoga betah ✨",
    color: "a78bfa",
    bannerPreset: "aurora",
    bannerUrl: "",
    showBanner: true,
    mention: true,
  },
  goodbye: {
    enabled: false,
    channelId: null,
    title: "Sampai jumpa",
    message: "**{user.tag}** telah keluar dari **{server}**.\nSekarang ada **{membercount}** member.",
    color: "ff8c42",
    bannerPreset: "dusk",
    bannerUrl: "",
    showBanner: true,
    mention: false,
  },
});

function getConfig(guildId) {
  const cfg = db.guildBucket("welcome", guildId, DEFAULTS);
  const d = DEFAULTS();
  for (const kind of ["welcome", "goodbye"]) {
    if (!cfg[kind]) cfg[kind] = d[kind];
    for (const [k, v] of Object.entries(d[kind])) {
      if (cfg[kind][k] == null) cfg[kind][k] = v;
    }
  }
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

async function buildPayload(kind, cfgPart, member) {
  const isWelcome = kind === "welcome";
  const user = member.user || member;
  const banner = await buildBannerAttachment(cfgPart);
  const e = embed({
    color: parseColor(cfgPart.color, isWelcome ? COLORS.violet : COLORS.orange),
    title: cfgPart.title || (isWelcome ? "👋 Selamat Datang!" : "👋 Selamat Tinggal"),
    description: formatMessage(cfgPart.message, member),
    thumbnail: user.displayAvatarURL?.({ size: 256 }) || undefined,
    image: banner?.url,
    footer: member.guild ? `${member.guild.name} · X Community` : "X Community",
    author: {
      name: user.tag || user.username,
      iconURL: user.displayAvatarURL?.({ size: 64 }),
    },
  });
  return {
    content: cfgPart.mention && isWelcome ? `${member}` : undefined,
    embeds: [e],
    files: banner?.file ? [banner.file] : [],
  };
}

async function sendCard(guild, kind, member) {
  const cfg = getConfig(guild.id);
  const part = cfg[kind];
  if (!part?.enabled || !part.channelId) return;
  const channel = guild.channels.cache.get(part.channelId);
  if (!channel || !channel.isTextBased()) return;
  try {
    const payload = await buildPayload(kind, part, member);
    await channel.send(payload);
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

  if (sub === "banner") {
    const url = interaction.options.getString("url");
    const preset = interaction.options.getString("preset");
    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        return respond(interaction, { content: "❌ URL banner tidak valid.", ephemeral: true });
      }
      part.bannerUrl = url;
    }
    if (preset) {
      part.bannerPreset = preset;
      part.showBanner = preset !== "none";
      if (preset !== "custom") part.bannerUrl = "";
    } else {
      part.showBanner = true;
    }
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, { content: `✅ Banner ${label.toLowerCase()} disimpan.`, ephemeral: true });
  }

  if (sub === "warna") {
    const hex = interaction.options.getString("hex").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return respond(interaction, { content: "❌ Warna harus hex 6 digit, contoh `a78bfa`.", ephemeral: true });
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
  sendCard,
  listPresets,
};
