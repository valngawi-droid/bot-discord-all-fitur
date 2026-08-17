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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Website berjalan di http://0.0.0.0:${PORT}`);
  if (DEMO_MODE) {
    console.log("⚠️  MODE DEMO aktif — isi PTERO_URL & PTERO_APP_KEY di .env untuk koneksi panel asli");
  }
});
