// ==========================================
// BOT DISCORD - AUTO CREATE PANEL PTERODACTYL
// ==========================================
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
} = require("discord.js");
const ptero = require("./pterodactyl");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const OWNER_IDS = (process.env.OWNER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAdmin(interaction) {
  if (OWNER_IDS.includes(interaction.user.id)) return true;
  if (interaction.member && interaction.member.roles) {
    const roles = interaction.member.roles.cache;
    if (ADMIN_ROLE_IDS.some((r) => roles.has(r))) return true;
  }
  return false;
}

client.once("ready", () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
  client.user.setActivity("Auto Create Panel 🚀", {
    type: ActivityType.Watching,
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;

  try {
    // ============ /ping ============
    if (cmd === "ping") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle("🏓 Pong!")
            .setDescription(`Latensi: **${client.ws.ping}ms**`)
            .setTimestamp(),
        ],
      });
    }

    // ============ /help ============
    if (cmd === "help") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📖 Bantuan — Bot Auto Create Panel")
            .setDescription(
              [
                "`/createpanel <username> <paket>` — Buat user + server panel otomatis",
                "`/deletepanel <server_id>` — Hapus server panel",
                "`/deleteuser <user_id>` — Hapus user panel",
                "`/listserver` — Daftar server di panel",
                "`/listuser` — Daftar user di panel",
                "`/ping` — Cek status bot",
              ].join("\n")
            )
            .setFooter({ text: "Pterodactyl Auto Panel Bot" })
            .setTimestamp(),
        ],
      });
    }

    // ============ Command admin only ============
    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Kamu tidak punya izin memakai command ini!",
        ephemeral: true,
      });
    }

    // ============ /createpanel ============
    if (cmd === "createpanel") {
      const username = interaction.options.getString("username");
      const plan = interaction.options.getString("paket");

      await interaction.deferReply({ ephemeral: true });

      const result = await ptero.autoCreatePanel({ username, plan });

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("✅ Panel Berhasil Dibuat!")
        .setDescription("Berikut detail akun panel kamu. **Jangan bagikan ke siapapun!**")
        .addFields(
          { name: "🌐 Login Panel", value: result.panelUrl, inline: false },
          { name: "👤 Username", value: `\`${result.username}\``, inline: true },
          { name: "📧 Email", value: `\`${result.email}\``, inline: true },
          { name: "🔑 Password", value: `\`${result.password}\``, inline: false },
          { name: "📦 Paket", value: result.server.plan, inline: true },
          { name: "💾 RAM", value: result.server.ram, inline: true },
          { name: "⚙️ CPU", value: result.server.cpu, inline: true },
          { name: "💿 Disk", value: result.server.disk, inline: true },
          { name: "🆔 Server ID", value: `${result.server.id}`, inline: true }
        )
        .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` })
        .setTimestamp();

      // Kirim detail via DM juga
      try {
        await interaction.user.send({ embeds: [embed] });
        await interaction.editReply({
          content: "✅ Panel berhasil dibuat! Detail sudah dikirim ke **DM kamu** 📩",
          embeds: [embed],
        });
      } catch {
        await interaction.editReply({ embeds: [embed] });
      }
      return;
    }

    // ============ /deletepanel ============
    if (cmd === "deletepanel") {
      const serverId = interaction.options.getInteger("server_id");
      await interaction.deferReply({ ephemeral: true });
      await ptero.deleteServer(serverId);
      return interaction.editReply(`🗑️ Server dengan ID **${serverId}** berhasil dihapus!`);
    }

    // ============ /deleteuser ============
    if (cmd === "deleteuser") {
      const userId = interaction.options.getInteger("user_id");
      await interaction.deferReply({ ephemeral: true });
      await ptero.deleteUser(userId);
      return interaction.editReply(`🗑️ User dengan ID **${userId}** berhasil dihapus!`);
    }

    // ============ /listserver ============
    if (cmd === "listserver") {
      await interaction.deferReply({ ephemeral: true });
      const data = await ptero.listServers();
      const lines = data.data
        .slice(0, 20)
        .map(
          (s) =>
            `\`${s.attributes.id}\` • **${s.attributes.name}** (user: ${s.attributes.user})`
        );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`📋 Daftar Server (${data.meta.pagination.total} total)`)
            .setDescription(lines.join("\n") || "Tidak ada server.")
            .setTimestamp(),
        ],
      });
    }

    // ============ /listuser ============
    if (cmd === "listuser") {
      await interaction.deferReply({ ephemeral: true });
      const data = await ptero.listUsers();
      const lines = data.data
        .slice(0, 20)
        .map(
          (u) =>
            `\`${u.attributes.id}\` • **${u.attributes.username}** (${u.attributes.email})`
        );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`👥 Daftar User (${data.meta.pagination.total} total)`)
            .setDescription(lines.join("\n") || "Tidak ada user.")
            .setTimestamp(),
        ],
      });
    }
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    const msg =
      "❌ Terjadi error: `" +
      (err.response?.data?.errors?.[0]?.detail || err.message) +
      "`";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum diisi di file .env!");
  process.exit(1);
}

client.login(process.env.BOT_TOKEN);
