// ==========================================
// WEBSITE DASHBOARD - AUTO CREATE PANEL
// ==========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const ptero = require("../pterodactyl");

const app = express();
const PORT = process.env.WEB_PORT || 3000;
const ADMIN_PASSWORD = process.env.WEB_ADMIN_PASSWORD || "admin123";

// Cek apakah konfigurasi panel sudah diisi (kalau belum → mode demo)
const DEMO_MODE =
  !process.env.PTERO_URL ||
  !process.env.PTERO_APP_KEY ||
  process.env.PTERO_APP_KEY.includes("xxxx");

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
  res.json({
    demo: DEMO_MODE,
    panelUrl: process.env.PTERO_URL || "(belum diatur)",
    plans: ptero.PLANS,
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

// Demo data
let demoServers = [
  { id: 1, name: "budi-server", user: 1, ram: "2048 MB", plan: "2GB" },
  { id: 2, name: "siti-server", user: 2, ram: "Unlimited", plan: "UNLI" },
];
let demoUsers = [
  { id: 1, username: "budi", email: "budi@panel.gg" },
  { id: 2, username: "siti", email: "siti@panel.gg" },
];
let demoNextId = 3;

app.post("/api/create-panel", auth, async (req, res) => {
  const { username, plan } = req.body;
  if (!username || !plan)
    return res.status(400).json({ error: "Username dan paket wajib diisi!" });

  try {
    if (DEMO_MODE) {
      // Simulasi tanpa panel asli
      const cleanName = username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const planData = ptero.PLANS[plan];
      const pass = ptero.generatePassword();
      const id = demoNextId++;
      demoUsers.push({ id, username: cleanName, email: `${cleanName}@panel.gg` });
      demoServers.push({
        id,
        name: `${cleanName}-server`,
        user: id,
        ram: planData.ram === 0 ? "Unlimited" : `${planData.ram} MB`,
        plan: plan.toUpperCase(),
      });
      return res.json({
        demo: true,
        panelUrl: "https://panel.domainkamu.com",
        username: cleanName,
        email: `${cleanName}@panel.gg`,
        password: pass,
        server: {
          id,
          name: `${cleanName}-server`,
          ram: planData.ram === 0 ? "Unlimited" : `${planData.ram} MB`,
          disk: planData.disk === 0 ? "Unlimited" : `${planData.disk} MB`,
          cpu: planData.cpu === 0 ? "Unlimited" : `${planData.cpu}%`,
          plan: planData.label,
        },
      });
    }

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
    if (DEMO_MODE) return res.json({ demo: true, servers: demoServers });
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
    if (DEMO_MODE) return res.json({ demo: true, users: demoUsers });
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
    if (DEMO_MODE) {
      demoServers = demoServers.filter((s) => s.id !== id);
      return res.json({ ok: true, demo: true });
    }
    await ptero.deleteServer(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (DEMO_MODE) {
      demoUsers = demoUsers.filter((u) => u.id !== id);
      return res.json({ ok: true, demo: true });
    }
    await ptero.deleteUser(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Website berjalan di http://0.0.0.0:${PORT}`);
  if (DEMO_MODE) {
    console.log("⚠️  MODE DEMO aktif — isi PTERO_URL & PTERO_APP_KEY di .env untuk koneksi panel asli");
  }
});
