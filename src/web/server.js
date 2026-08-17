// ==========================================
// WEBSITE DASHBOARD - AUTO CREATE PANEL
// ==========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const ptero = require("../pterodactyl");
const store = require("../features/store");
const welcome = require("../features/welcome");

const app = express();
const PORT = process.env.WEB_PORT || 3000;
const ADMIN_PASSWORD = process.env.WEB_ADMIN_PASSWORD || "admin123";
const GUILD_ID = process.env.GUILD_ID || "web";

// Mode demo terpusat dari modul pterodactyl
const DEMO_MODE = ptero.DEMO_MODE;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============ Session token sederhana (in-memory) ============
const sessions = new Set();

function auth(req, res, next) {
  const token = req.headers["x-auth-token"];
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: "Belum login" });
}

// ============ API ============
app.get("/api/status", (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  res.json({
    demo: DEMO_MODE,
    panelUrl: process.env.PTERO_URL || "(belum diatur)",
    plans: ptero.PLANS,
    store: {
      name: cfg.name,
      open: cfg.open,
      hours: `${cfg.hoursOpen} — ${cfg.hoursClose}`,
      products: cfg.products.length,
      payments: cfg.payments.length,
    },
  });
});

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: "Password salah!" });
});

app.post("/api/create-panel", auth, async (req, res) => {
  const { username, plan } = req.body;
  if (!username || !plan)
    return res.status(400).json({ error: "Username dan paket wajib diisi!" });

  try {
    const result = await ptero.autoCreatePanel({ username, plan });
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error:
        err.response?.data?.errors?.[0]?.detail || err.message || "Gagal membuat panel",
    });
  }
});

app.get("/api/servers", auth, async (req, res) => {
  try {
    const data = await ptero.listServers();
    res.json({
      servers: data.data.map((s) => ({
        id: s.attributes.id,
        name: s.attributes.name,
        user: s.attributes.user,
        ram:
          s.attributes.limits.memory === 0
            ? "Unlimited"
            : `${s.attributes.limits.memory} MB`,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", auth, async (req, res) => {
  try {
    const data = await ptero.listUsers();
    res.json({
      users: data.data.map((u) => ({
        id: u.attributes.id,
        username: u.attributes.username,
        email: u.attributes.email,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/servers/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await ptero.deleteServer(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await ptero.deleteUser(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ STORE ============
app.get("/api/store", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const wel = welcome.getConfig(GUILD_ID);
  res.json({ store: cfg, welcome: wel });
});

app.post("/api/store/toggle", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  cfg.open = !cfg.open;
  store.saveConfig(GUILD_ID, cfg);
  res.json({ open: cfg.open, name: cfg.name });
});

app.post("/api/store/settings", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const { name, hoursOpen, hoursClose } = req.body || {};
  if (name) cfg.name = String(name).slice(0, 64);
  if (hoursOpen) cfg.hoursOpen = String(hoursOpen).slice(0, 16);
  if (hoursClose) cfg.hoursClose = String(hoursClose).slice(0, 16);
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
  res.json({ ok: true, payments: cfg.payments });
});

app.delete("/api/store/payments/:method", auth, (req, res) => {
  const cfg = store.getConfig(GUILD_ID);
  const key = decodeURIComponent(req.params.method).toLowerCase();
  cfg.payments = cfg.payments.filter((p) => p.method.toLowerCase() !== key);
  store.saveConfig(GUILD_ID, cfg);
  res.json({ ok: true });
});

app.post("/api/welcome", auth, (req, res) => {
  const cfg = welcome.getConfig(GUILD_ID);
  const { kind, enabled, message, color } = req.body || {};
  if (kind !== "welcome" && kind !== "goodbye") {
    return res.status(400).json({ error: "kind harus welcome/goodbye" });
  }
  if (typeof enabled === "boolean") cfg[kind].enabled = enabled;
  if (message) cfg[kind].message = String(message).slice(0, 500);
  if (color && /^[0-9a-fA-F]{6}$/.test(color.replace("#", ""))) {
    cfg[kind].color = color.replace("#", "");
  }
  welcome.saveConfig(GUILD_ID, cfg);
  res.json(cfg);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Website berjalan di http://0.0.0.0:${PORT}`);
  if (DEMO_MODE) {
    console.log("⚠️  MODE DEMO aktif — isi PTERO_URL & PTERO_APP_KEY di .env untuk koneksi panel asli");
  }
});
