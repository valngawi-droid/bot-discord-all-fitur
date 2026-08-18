// ==========================================
// ENTRY POINT — X Community (bot + website)
// npm start
// ==========================================
require("dotenv").config();
process.env.BOT_TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN || "";
const { WEB_NAME } = require("./src/lib/brand");

console.log("╔══════════════════════════════════════════╗");
console.log(`║  ${WEB_NAME.padEnd(38)}║`);
console.log("║  Store · Ticket · Welcome · Komunitas    ║");
console.log("╚══════════════════════════════════════════╝");

require("./src/web/server.js");

if (process.env.BOT_TOKEN && !process.env.BOT_TOKEN.includes("TOKEN_BOT")) {
  require("./src/bot.js");
} else {
  console.log("⚠️  BOT_TOKEN belum diisi di .env — bot Discord tidak dijalankan.");
  console.log("    Website X Community tetap berjalan.");
}
