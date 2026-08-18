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

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Set();

function auth(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: "Belum login" });
}

function gid(req) {
  return (
    req.headers["x-guild-id"] ||
    req.query.guild ||
    req.body?.guildId ||
    process.env.GUILD_ID ||
    runtime.firstGuildId() ||
    "web"
  );
}

async function guildOrFail(req) {
  return runtime.getGuildSnapshot(gid(req));
}

app.get("/api/status", async (req, res) => {
  const id = gid(req);
  const cfg = store.getConfig(id);
  const snap = await guildOrFail(req);
  const guilds = runtime.listGuilds();
  res.json({
    webName: WEB_NAME,
    botOnline: runtime.isReady(),
    guildId: id,
    guildName: snap?.name || null,
    memberCount: snap?.memberCount || 0,
    guildCount: guilds.length,
    guilds,
    inviteUrl: runtime.inviteUrl(),
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
  const id = gid(req);
  const snap = await guildOrFail(req);
  const guilds = runtime.listGuilds();
  res.json({
    webName: WEB_NAME,
    botOnline: runtime.isReady(),
    guildId: id,
    guild: snap,
    guilds,
    inviteUrl: runtime.inviteUrl(),
    store: store.getConfig(id),
    welcome: welcome.getConfig(id),
    community: community.getConfig(id),
    tickets: tickets.listOpen(id),
    roles: takerole.listPanels(id),
    banners: listPresets(),
    settings: settings.publicView(),
    levels: community.topLevels(id, 8),
  });
});

app.get("/api/discord", auth, async (req, res) => {
  res.json({
    guild: await guildOrFail(req),
    guilds: runtime.listGuilds(),
    botOnline: runtime.isReady(),
    inviteUrl: runtime.inviteUrl(),
  });
});

// ---- store ----
app.get("/api/store", auth, (req, res) => {
  res.json(store.getConfig(gid(req)));
});

app.post("/api/store/toggle", auth, async (req, res) => {
  const cfg = store.getConfig(gid(req));
  cfg.open = !cfg.open;
  store.saveConfig(gid(req), cfg);
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
  const cfg = store.getConfig(gid(req));
  const body = req.body || {};
  for (const key of ["name", "hoursOpen", "hoursClose", "channelId", "ticketCategoryId", "staffRoleId", "ownerId"]) {
    if (body[key] !== undefined) cfg[key] = body[key] || null;
  }
  store.saveConfig(gid(req), cfg);
  res.json(cfg);
});

app.post("/api/store/products", auth, (req, res) => {
  const cfg = store.getConfig(gid(req));
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
  store.saveConfig(gid(req), cfg);
  res.json(item);
});

app.delete("/api/store/products/:id", auth, (req, res) => {
  const cfg = store.getConfig(gid(req));
  cfg.products = cfg.products.filter((p) => p.id !== req.params.id);
  store.saveConfig(gid(req), cfg);
  res.json({ ok: true });
});

app.post("/api/store/payments", auth, (req, res) => {
  const cfg = store.getConfig(gid(req));
  const { method, number, holder } = req.body || {};
  if (!method || !number) return res.status(400).json({ error: "Metode dan nomor wajib" });
  cfg.payments.push({
    method: String(method).slice(0, 32),
    number: String(number).slice(0, 64),
    holder: holder ? String(holder).slice(0, 64) : "",
  });
  store.saveConfig(gid(req), cfg);
  res.json(cfg.payments);
});

app.delete("/api/store/payments/:method", auth, (req, res) => {
  const cfg = store.getConfig(gid(req));
  const key = decodeURIComponent(req.params.method).toLowerCase();
  cfg.payments = cfg.payments.filter((p) => p.method.toLowerCase() !== key);
  store.saveConfig(gid(req), cfg);
  res.json({ ok: true });
});

// ---- welcome ----
app.get("/api/welcome", auth, (req, res) => {
  res.json({ config: welcome.getConfig(gid(req)), banners: listPresets() });
});

app.post("/api/welcome", auth, (req, res) => {
  const cfg = welcome.getConfig(gid(req));
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
  welcome.saveConfig(gid(req), cfg);
  res.json(cfg);
});

app.post("/api/welcome/test", auth, async (req, res) => {
  const kind = req.body?.kind === "goodbye" ? "goodbye" : "welcome";
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  try {
    const guild = await client.guilds.fetch(gid(req));
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
    config: community.getConfig(gid(req)),
    levels: community.topLevels(gid(req), 15),
  });
});

app.post("/api/community", auth, (req, res) => {
  const cfg = community.getConfig(gid(req));
  const body = req.body || {};
  if (body.autoroleId !== undefined) cfg.autoroleId = body.autoroleId || null;
  if (body.suggestChannelId !== undefined) cfg.suggestChannelId = body.suggestChannelId || null;
  if (body.logChannelId !== undefined) cfg.logChannelId = body.logChannelId || null;
  if (body.leveling) Object.assign(cfg.leveling, body.leveling);
  if (body.logEvents) Object.assign(cfg.logEvents, body.logEvents);
  if (body.starboard) Object.assign(cfg.starboard, body.starboard);
  if (body.verify) Object.assign(cfg.verify, body.verify);
  community.saveConfig(gid(req), cfg);
  res.json(cfg);
});

app.post("/api/verify/panel", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  const cfg = community.getConfig(gid(req));
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
  res.json({ open: tickets.listOpen(gid(req)) });
});

app.post("/api/ticket/panel", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  const { channelId, title, description, categoryId } = req.body || {};
  if (!channelId) return res.status(400).json({ error: "Pilih channel" });
  try {
    if (categoryId) {
      const cfg = store.getConfig(gid(req));
      cfg.ticketCategoryId = categoryId;
      store.saveConfig(gid(req), cfg);
    }
    const ch = await client.channels.fetch(channelId);
    await tickets.postPanel(ch, { title, description });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/takerole", auth, (req, res) => {
  res.json({ panels: takerole.listPanels(gid(req)) });
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
    const panel = await takerole.addRoleToPanel(client, gid(req), req.body || {});
    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/takerole/role", auth, async (req, res) => {
  const client = runtime.getClient();
  if (!runtime.isReady()) return res.status(400).json({ error: "Bot belum online" });
  try {
    const panel = await takerole.removeRoleFromPanel(client, gid(req), req.body || {});
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
    const onlyThis = body.allGuilds === false || body.allGuilds === "false";
    await runtime.applyBotName(saved.botName, onlyThis ? gid(req) : undefined);
  }
  const client = runtime.getClient();
  if (client?.user) {
    const type = require("discord.js").ActivityType[saved.activityType] ?? 3;
    client.user.setActivity(saved.activity || saved.botName, { type }).catch(() => {});
  }
  res.json(saved);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 ${WEB_NAME} dashboard listen 0.0.0.0:${PORT}`);
  console.log("   Jangan buka 0.0.0.0 — itu alamat dalam server.");
  console.log("   Cek tab Network di KataBump. Kalau ada IP publik, buka http://IP:PORT");
  console.log("   Paket bot gratis sering tidak punya IP publik — pakai slash command di Discord.");
});
