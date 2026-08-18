// ==========================================
// Utilitas bersama
// ==========================================
const { EmbedBuilder } = require("discord.js");

const COLORS = {
  green: 0x00ff88,
  red: 0xff5c6c,
  blurple: 0x5865f2,
  gold: 0xf0c040,
  teal: 0x00d9a5,
  orange: 0xff8c42,
  pink: 0xff6b9d,
  dark: 0x141926,
  violet: 0xa78bfa,
};

function rupiah(n) {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function coins(n) {
  return `${Number(n || 0).toLocaleString("id-ID")} 🪙`;
}

function embed(opts = {}) {
  const e = new EmbedBuilder()
    .setColor(opts.color ?? COLORS.blurple)
    .setTimestamp();
  if (opts.title) e.setTitle(opts.title);
  if (opts.description) e.setDescription(opts.description);
  if (opts.footer) e.setFooter({ text: opts.footer });
  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.image) e.setImage(opts.image);
  if (opts.author) e.setAuthor(opts.author);
  if (opts.fields) e.addFields(opts.fields);
  return e;
}

async function respond(interaction, payload) {
  const data = typeof payload === "string" ? { content: payload } : payload;
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(data);
  }
  return interaction.reply(data);
}

function parseColor(input, fallback = COLORS.teal) {
  if (!input) return fallback;
  const hex = String(input).replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  return parseInt(hex, 16);
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "item";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function progressBar(current, max, size = 10) {
  const filled = Math.round((current / max) * size);
  return "█".repeat(clamp(filled, 0, size)) + "░".repeat(clamp(size - filled, 0, size));
}

const cooldowns = new Map();

function takeCooldown(key, ms) {
  const now = Date.now();
  const until = cooldowns.get(key) || 0;
  if (now < until) return Math.ceil((until - now) / 1000);
  cooldowns.set(key, now + ms);
  return 0;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h} jam ${m} menit`;
  if (m) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
}

module.exports = {
  COLORS,
  rupiah,
  coins,
  embed,
  respond,
  parseColor,
  slug,
  pick,
  shuffle,
  clamp,
  progressBar,
  takeCooldown,
  formatDuration,
};
