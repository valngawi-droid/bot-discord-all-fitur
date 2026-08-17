// ==========================================
// Command Auto Create Panel Pterodactyl
// ==========================================
const { EmbedBuilder } = require("discord.js");
const ptero = require("../pterodactyl");
const { isAdmin, deny } = require("../lib/permissions");
const { respond } = require("../lib/util");

async function handle(interaction) {
  if (!isAdmin(interaction)) return deny(interaction);
  const cmd = interaction.commandName;

  if (cmd === "createpanel") {
    const username = interaction.options.getString("username");
    const plan = interaction.options.getString("paket");
    await interaction.deferReply({ ephemeral: true });
    const result = await ptero.autoCreatePanel({ username, plan });
    const embed = new EmbedBuilder()
      .setColor(result.demo ? 0xffc400 : 0x00ff88)
      .setTitle(result.demo ? "🧪 [DEMO] Panel Berhasil Dibuat!" : "✅ Panel Berhasil Dibuat!")
      .setDescription(
        (result.demo
          ? "⚠️ **MODE DEMO** — data hanya simulasi, panel asli belum disambungkan.\n\n"
          : "") + "Berikut detail akun panel kamu. **Jangan bagikan ke siapapun!**"
      )
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

  if (cmd === "deletepanel") {
    const serverId = interaction.options.getInteger("server_id");
    await interaction.deferReply({ ephemeral: true });
    await ptero.deleteServer(serverId);
    return interaction.editReply(`🗑️ Server dengan ID **${serverId}** berhasil dihapus!`);
  }

  if (cmd === "deleteuser") {
    const userId = interaction.options.getInteger("user_id");
    await interaction.deferReply({ ephemeral: true });
    await ptero.deleteUser(userId);
    return interaction.editReply(`🗑️ User dengan ID **${userId}** berhasil dihapus!`);
  }

  if (cmd === "listserver") {
    await interaction.deferReply({ ephemeral: true });
    const data = await ptero.listServers();
    const lines = data.data
      .slice(0, 20)
      .map((s) => `\`${s.attributes.id}\` • **${s.attributes.name}** (user: ${s.attributes.user})`);
    return respond(interaction, {
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📋 Daftar Server (${data.meta.pagination.total} total)`)
          .setDescription(lines.join("\n") || "Tidak ada server.")
          .setTimestamp(),
      ],
    });
  }

  if (cmd === "listuser") {
    await interaction.deferReply({ ephemeral: true });
    const data = await ptero.listUsers();
    const lines = data.data
      .slice(0, 20)
      .map((u) => `\`${u.attributes.id}\` • **${u.attributes.username}** (${u.attributes.email})`);
    return respond(interaction, {
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`👥 Daftar User (${data.meta.pagination.total} total)`)
          .setDescription(lines.join("\n") || "Tidak ada user.")
          .setTimestamp(),
      ],
    });
  }
}

module.exports = { handle };
