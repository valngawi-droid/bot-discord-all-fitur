// ==========================================
// ENTRY POINT — Jalankan Bot + Website sekaligus
// npm start
// ==========================================
require("dotenv").config();

console.log("╔══════════════════════════════════════════╗");
console.log("║  🦖 ALL FITUR — Panel + Store + Games    ║");
console.log("╚══════════════════════════════════════════╝");

// Jalankan website
require("./src/web/server.js");

// Jalankan bot discord (hanya jika token diisi)
if (process.env.BOT_TOKEN && !process.env.BOT_TOKEN.includes("TOKEN_BOT")) {
  require("./src/bot.js");
} else {
  console.log("⚠️  BOT_TOKEN belum diisi di .env — bot Discord tidak dijalankan.");
  console.log("    Website tetap berjalan normal.");
}
