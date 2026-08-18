// ==========================================
// X Community — Website Dashboard
// ==========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const store = require("../features/store");
const welcome = require("../features/welcome");
const tickets = require("../features/tickets");
const takerole = require("../features/takerole");
const community = require("../features/community");
const { listPresets } = require("../features/banner");
const runtime = require("../lib/runtime");
const settings = require("../lib/settings");
const { WEB_NAME } = require("../lib/brand");

const app = express();
// Katabump / Pterodactyl memakai SERVER_PORT
const PORT = Number(process.env.SERVER_PORT || process.env.PORT || process.env.WEB_PORT || 3000);
const ADMIN_PASSWORD = process.env.WEB_ADMIN_PASSWORD || "admin123";
const GUILD_ID = process.env.GUILD_ID || "web";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Set();

function auth(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: "Belum login" });
}

async function guildOrFail() {
  return runtime.getGuildSnapshot(GUILD_ID);
}

app.get("/api/status", async (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const snap = await guildOrFail();
  res.json({
    webName: WEB_NAME,
    botOnline: runtime.isReady(),
    guildName: snap?.name || null,
    memberCount: snap?.memberCount || 0,
    store: {
      name: cfg.name,
      open: cfg.open,
      hours: `${cfg.hoursOpen} — ${cfg.hoursClose}`,
      products: cfg.products.length,
      payments: cfg.payments.length,
    },
    settings: settings.publicView(),
  });
});

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    return res.json({ token, webName: WEB_NAME });
  }
  res.status(401).json({ error: "Password salah!" });
});

app.get("/api/bootstrap", auth, async (req, res) => {
  const snap = await guildOrFail();
  res.json({
    webName: WEB_NAME,
    botOnline: runtime.isReady(),
    guild: snap,
    store: store.getConfig(GUILD_ID),
    welcome: welcome.getConfig(GUILD_ID),
    community: community.getConfig(GUILD_ID),
    tickets: tickets.listOpen(GUILD_ID),
    roles: takerole.listPanels(GUILD_ID),
    banners: listPresets(),
    settings: settings.publicView(),
    levels: community.topLevels(GUILD_ID, 8),
  });
});

app.get("/api/discord", auth, async (req, res) => {
  res.json({ guild: await guildOrFail(), botOnline: runtime.isReady() });
});

// ---- store ----
app.get("/api/store", auth, (req, res) => {
  res.json(store.getConfig(GUILD_ID));
});

app.post("/api/store/toggle", auth, async (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  cfg.open = !cfg.open;
  store.saveConfig(GUILD_ID, cfg);
  const announce = req.body?.announce;
  if (announce && runtime.isReady() && cfg.channelId) {
    try {
      const client = runtime.getClient();
      const ch = await client.channels.fetch(cfg.channelId);
      const { statusEmbed } = store;
      if (ch?.isTextBased() && statusEmbed) {
        await ch.send({ embeds: [statusEmbed(cfg)] });
      }
    } catch {
      /* ignore */
    }
  }
  res.json(cfg);
});

app.post("/api/store/settings", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const body = req.body || {};
  for (const key of ["name", "hoursOpen", "hoursClose", "channelId", "ticketCategoryId", "staffRoleId", "ownerId"]) {
    if (body[key] !== undefined) cfg[key] = body[key] || null;
  }
  store.saveConfig(GUILD_ID, cfg);
  res.json(cfg);
});

app.post("/api/store/products", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const { name, price, stock, description } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: "Nama dan harga wajib" });
  const item = {
    id: `web-${cfg.nextProductId++}`,
    name: String(name).slice(0, 64),
    price: Number(price) || 0,
    stock: stock == null || stock === "" ? -1 : Number(stock),
    description: description ? String(description).slice(0, 200) : "",
  };
  cfg.products.push(item);
  store.saveConfig(GUILD_ID, cfg);
  res.json(item);
});

app.delete("/api/store/products/:id", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  cfg.products = cfg.products.filter((p) => p.id !== req.params.id);
  store.saveConfig(GUILD_ID, cfg);
  res.json({ ok: true });
});

app.post("/api/store/payments", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const { method, number, holder } = req.body || {};
  if (!method || !number) return res.status(400).json({ error: "Metode dan nomor wajib" });
  cfg.payments.push({
    method: String(method).slice(0, 32),
    number: String(number).slice(0, 64),
    holder: holder ? String(holder).slice(0, 64) : "",
  });
  store.saveConfig(GUILD_ID, cfg);
  res.json(cfg.payments);
});

app.delete("/api/store/payments/:method", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const key = decodeURIComponent(req.params.method).toLowerCase();
  cfg.payments = cfg.payments.filter((p) => p.method.toLowerCase() !== key);
  store.saveConfig(GUILD_ID, cfg);
  res.json({ ok: true });
});

// ---- welcome ----
app.get("/api/welcome", auth, (req, res) => {
  res.json({ config: welcome.getConfig(GUILD_ID), banners: listPresets() });
});

app.post("/api/welcome", auth, (req, res) => {
  const cfg = welcome.getConfig(GUILD_ID);
  const { kind } = req.body || {};
  if (kind !== "welcome" && kind !== "goodbye") {
    return res.status(400).json({ error: "kind harus welcome/goodbye" });
  }
  const part = cfg[kind];
  const allow = [
    "enabled",
    "channelId",
    "title",
    "message",
    "color",
    "bannerPreset",
    "bannerUrl",
    "showBanner",
    "mention",
  ];
  for (const k of allow) {
    if (req.body[k] !== undefined) part[k] = req.body[k];
  }
  if (part.bannerUrl) part.bannerUrl = String(part.bannerUrl).slice(0, 400);
  welcome.saveConfig(GUILD_ID, cfg);
  res.json(cfg);
});

app.post("/api/welcome/test", auth, async (req, res) => {
  const kind = req.body?.kind === "goodbye" ? "goodbye" : "welcome";
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(guild.ownerId).catch(() => guild.members.me);
    await welcome.sendCard(guild, kind, member);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- community ----
app.get("/api/community", auth, (req, res) => {
  res.json({
    config: community.getConfig(GUILD_ID),
    levels: community.topLevels(GUILD_ID, 15),
  });
});

app.post("/api/community", auth, (req, res) => {
  const cfg = community.getConfig(GUILD_ID);
  const body = req.body || {};
  if (body.autoroleId !== undefined) cfg.autoroleId = body.autoroleId || null;
  if (body.suggestChannelId !== undefined) cfg.suggestChannelId = body.suggestChannelId || null;
  if (body.logChannelId !== undefined) cfg.logChannelId = body.logChannelId || null;
  if (body.leveling) Object.assign(cfg.leveling, body.leveling);
  if (body.logEvents) Object.assign(cfg.logEvents, body.logEvents);
  if (body.starboard) Object.assign(cfg.starboard, body.starboard);
  if (body.verify) Object.assign(cfg.verify, body.verify);
  community.saveConfig(GUILD_ID, cfg);
  res.json(cfg);
});

app.post("/api/verify/panel", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  const cfg = community.getConfig(GUILD_ID);
  const channelId = req.body?.channelId;
  if (!channelId) return res.status(400).json({ error: "Pilih channel" });
  if (!cfg.verify.roleId) return res.status(400).json({ error: "Atur role verifikasi dulu" });
  try {
    const ch = await client.channels.fetch(channelId);
    await community.postVerifyPanel(ch, cfg);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- ticket / takerole ----
app.get("/api/tickets", auth, (req, res) => {
  res.json({ open: tickets.listOpen(GUILD_ID) });
});

app.post("/api/ticket/panel", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  const { channelId, title, description, categoryId } = req.body || {};
  if (!channelId) return res.status(400).json({ error: "Pilih channel" });
  try {
    if (categoryId) {
      const cfg = store.getConfig(GUILD_ID);
      cfg.ticketCategoryId = categoryId;
      store.saveConfig(GUILD_ID, cfg);
    }
    const ch = await client.channels.fetch(channelId);
    await tickets.postPanel(ch, { title, description });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/takerole", auth, (req, res) => {
  res.json({ panels: takerole.listPanels(GUILD_ID) });
});

app.post("/api/takerole/panel", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  const { channelId, title, description } = req.body || {};
  if (!channelId) return res.status(400).json({ error: "Pilih channel" });
  try {
    const ch = await client.channels.fetch(channelId);
    const panel = await takerole.createPanelInChannel(ch, { title, description });
    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/takerole/role", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  try {
    const panel = await takerole.addRoleToPanel(client, GUILD_ID, req.body || {});
    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/takerole/role", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  try {
    const panel = await takerole.removeRoleFromPanel(client, GUILD_ID, req.body || {});
    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- settings (bot name only; website name locked) ----
app.get("/api/settings", auth, (req, res) => {
  res.json(settings.publicView());
});

app.post("/api/settings", auth, async (req, res) => {
  const body = req.body || {};
  const saved = settings.save({
    botName: body.botName,
    activity: body.activity,
    activityType: body.activityType,
  });
  if (body.botName && runtime.isReady()) {
    await runtime.applyBotName(saved.botName);
  }
  const client = runtime.getClient();
  if (client?.user) {
    const type = require("discord.js").ActivityType[saved.activityType] ?? 3;
    client.user.setActivity(saved.activity || saved.botName, { type }).catch(() => {});
  }
  res.json(saved);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 ${WEB_NAME} dashboard: http://0.0.0.0:${PORT}`);
});
