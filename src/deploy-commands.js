// ==========================================
// Daftarkan Slash Commands ke Discord
// Jalankan: npm run deploy-commands
// ==========================================
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { PLANS } = require("./pterodactyl");

const planChoices = Object.entries(PLANS).map(([key, v]) => ({
  name: `${key.toUpperCase()} — ${v.label}`,
  value: key,
}));

const commands = [
  new SlashCommandBuilder()
    .setName("createpanel")
    .setDescription("🚀 Auto create panel Pterodactyl (user + server)")
    .addStringOption((o) =>
      o.setName("username").setDescription("Username untuk panel").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("paket")
        .setDescription("Pilih paket resource")
        .setRequired(true)
        .addChoices(...planChoices.slice(0, 25))
    ),

  new SlashCommandBuilder()
    .setName("deletepanel")
    .setDescription("🗑️ Hapus server panel berdasarkan ID")
    .addIntegerOption((o) =>
      o.setName("server_id").setDescription("ID server di panel").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("deleteuser")
    .setDescription("🗑️ Hapus user panel berdasarkan ID")
    .addIntegerOption((o) =>
      o.setName("user_id").setDescription("ID user di panel").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("listserver")
    .setDescription("📋 Lihat daftar server di panel"),

  new SlashCommandBuilder()
    .setName("listuser")
    .setDescription("👥 Lihat daftar user di panel"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Cek status bot"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("📖 Bantuan penggunaan bot"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("⏳ Mendaftarkan slash commands...");
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log("✅ Slash commands terdaftar di guild:", process.env.GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log("✅ Slash commands terdaftar secara global (butuh ±1 jam propagasi)");
    }
  } catch (err) {
    console.error("❌ Gagal daftar commands:", err);
  }
})();
