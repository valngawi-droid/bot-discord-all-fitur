// ==========================================
// Take Role — panel tombol ambil / lepas role
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../lib/db");
const { isAdmin, deny } = require("../lib/permissions");
const { COLORS, embed, respond } = require("../lib/util");

const STYLES = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

function all() {
  return db.load("takerole", { panels: {}, last: {} });
}

function save(data) {
  db.save("takerole", data);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildComponents(panel) {
  const rows = chunk(panel.roles.slice(0, 25), 5).map((group) => {
    const row = new ActionRowBuilder();
    for (const r of group) {
      const btn = new ButtonBuilder()
        .setCustomId(`takerole:${r.roleId}`)
        .setLabel(r.label.slice(0, 80))
        .setStyle(STYLES[r.style] || ButtonStyle.Secondary);
      if (r.emoji) {
        try {
          btn.setEmoji(r.emoji);
        } catch {
          /* ignore bad emoji */
        }
      }
      row.addComponents(btn);
    }
    return row;
  });
  return rows;
}

function panelEmbed(panel) {
  const list = panel.roles.length
    ? panel.roles.map((r) => `${r.emoji || "•"} <@&${r.roleId}> — **${r.label}**`).join("\n")
    : "_Belum ada role. Admin: `/takerole add`_";
  return embed({
    color: COLORS.pink,
    title: panel.title,
    description: `${panel.description}\n\n${list}`,
    footer: "Klik tombol untuk ambil / lepas role",
  });
}

async function refreshPanel(client, panel) {
  try {
    const channel = await client.channels.fetch(panel.channelId);
    const msg = await channel.messages.fetch(panel.messageId);
    await msg.edit({
      embeds: [panelEmbed(panel)],
      components: buildComponents(panel),
    });
  } catch {
    /* panel mungkin terhapus */
  }
}

async function handleCommand(interaction) {
  if (!interaction.guild) {
    return respond(interaction, { content: "❌ Command ini hanya untuk server.", ephemeral: true });
  }
  if (!isAdmin(interaction)) return deny(interaction);
  const sub = interaction.options.getSubcommand();
  const data = all();

  if (sub === "panel") {
    const title = interaction.options.getString("judul") || "🎭 Ambil Role";
    const description =
      interaction.options.getString("deskripsi") ||
      "Klik tombol di bawah untuk mengambil atau melepas role.";
    const panel = {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: null,
      title,
      description,
      roles: [],
    };
    const msg = await interaction.channel.send({
      embeds: [panelEmbed(panel)],
      components: [],
    });
    panel.messageId = msg.id;
    data.panels[msg.id] = panel;
    data.last[interaction.guildId] = msg.id;
    save(data);
    return respond(interaction, {
      content: `✅ Panel dibuat. Tambah role dengan \`/takerole add\` (otomatis ke panel ini).\nID pesan: \`${msg.id}\``,
      ephemeral: true,
    });
  }

  if (sub === "add") {
    const role = interaction.options.getRole("role");
    const label = interaction.options.getString("label") || role.name;
    const emoji = interaction.options.getString("emoji") || null;
    const style = interaction.options.getString("style") || "secondary";
    const messageId = interaction.options.getString("pesan_id") || data.last[interaction.guildId];
    if (!messageId || !data.panels[messageId]) {
      return respond(interaction, {
        content: "❌ Belum ada panel. Buat dulu dengan `/takerole panel`.",
        ephemeral: true,
      });
    }
    const me = interaction.guild.members.me;
    if (role.managed) {
      return respond(interaction, { content: "❌ Role itu dikelola integrasi, tidak bisa diberikan bot.", ephemeral: true });
    }
    if (role.position >= me.roles.highest.position) {
      return respond(interaction, {
        content: "❌ Role bot harus **di atas** role yang ingin diberikan. Geser di pengaturan server.",
        ephemeral: true,
      });
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return respond(interaction, { content: "❌ Bot butuh izin **Manage Roles**.", ephemeral: true });
    }
    const panel = data.panels[messageId];
    if (panel.roles.some((r) => r.roleId === role.id)) {
      return respond(interaction, { content: "❌ Role itu sudah ada di panel.", ephemeral: true });
    }
    if (panel.roles.length >= 25) {
      return respond(interaction, { content: "❌ Maksimal 25 tombol per panel.", ephemeral: true });
    }
    panel.roles.push({ roleId: role.id, label, emoji, style });
    save(data);
    await refreshPanel(interaction.client, panel);
    return respond(interaction, {
      content: `✅ Role ${role} ditambahkan ke panel.`,
      ephemeral: true,
    });
  }

  if (sub === "hapus") {
    const role = interaction.options.getRole("role");
    const messageId = interaction.options.getString("pesan_id") || data.last[interaction.guildId];
    if (!messageId || !data.panels[messageId]) {
      return respond(interaction, { content: "❌ Panel tidak ditemukan.", ephemeral: true });
    }
    const panel = data.panels[messageId];
    const before = panel.roles.length;
    panel.roles = panel.roles.filter((r) => r.roleId !== role.id);
    if (panel.roles.length === before) {
      return respond(interaction, { content: "❌ Role tidak ada di panel itu.", ephemeral: true });
    }
    save(data);
    await refreshPanel(interaction.client, panel);
    return respond(interaction, { content: `🗑️ ${role} dihapus dari panel.`, ephemeral: true });
  }

  if (sub === "list") {
    const panels = Object.values(data.panels).filter((p) => p.guildId === interaction.guildId);
    if (!panels.length) {
      return respond(interaction, { content: "Belum ada panel take role.", ephemeral: true });
    }
    const desc = panels
      .map(
        (p) =>
          `• \`${p.messageId}\` di <#${p.channelId}> — **${p.title}** (${p.roles.length} role)`
      )
      .join("\n");
    return respond(interaction, {
      embeds: [embed({ color: COLORS.pink, title: "🎭 Panel Take Role", description: desc })],
      ephemeral: true,
    });
  }
}

async function handleButton(interaction) {
  const roleId = interaction.customId.split(":")[1];
  const member = interaction.member;
  if (!member || !interaction.guild) {
    return interaction.reply({ content: "❌ Tidak bisa di DM.", ephemeral: true });
  }
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ content: "❌ Role sudah tidak ada.", ephemeral: true });
  }
  const me = interaction.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) {
    return interaction.reply({
      content: "❌ Bot tidak bisa mengatur role ini (cek urutan role & izin Manage Roles).",
      ephemeral: true,
    });
  }

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return interaction.reply({
        content: `➖ Role **${role.name}** dilepas.`,
        ephemeral: true,
      });
    }
    await member.roles.add(role);
    return interaction.reply({
      content: `➕ Role **${role.name}** diberikan.`,
      ephemeral: true,
    });
  } catch (err) {
    return interaction.reply({
      content: `❌ Gagal mengubah role: \`${err.message}\``,
      ephemeral: true,
    });
  }
}

async function createPanelInChannel(channel, { title, description } = {}) {
  const data = all();
  const panel = {
    guildId: channel.guild.id,
    channelId: channel.id,
    messageId: null,
    title: title || "🎭 Ambil Role",
    description: description || "Klik tombol di bawah untuk mengambil atau melepas role.",
    roles: [],
  };
  const msg = await channel.send({
    embeds: [panelEmbed(panel)],
    components: [],
  });
  panel.messageId = msg.id;
  data.panels[msg.id] = panel;
  data.last[channel.guild.id] = msg.id;
  save(data);
  return panel;
}

function listPanels(guildId) {
  return Object.values(all().panels).filter((p) => p.guildId === guildId);
}

async function addRoleToPanel(client, guildId, { roleId, label, emoji, style, messageId }) {
  const data = all();
  const id = messageId || data.last[guildId];
  if (!id || !data.panels[id]) throw new Error("Belum ada panel");
  const panel = data.panels[id];
  if (panel.roles.some((r) => r.roleId === roleId)) throw new Error("Role sudah ada di panel");
  if (panel.roles.length >= 25) throw new Error("Maksimal 25 tombol");
  panel.roles.push({
    roleId,
    label: label || "Role",
    emoji: emoji || null,
    style: style || "secondary",
  });
  save(data);
  await refreshPanel(client, panel);
  return panel;
}

async function removeRoleFromPanel(client, guildId, { roleId, messageId }) {
  const data = all();
  const id = messageId || data.last[guildId];
  if (!id || !data.panels[id]) throw new Error("Panel tidak ditemukan");
  const panel = data.panels[id];
  panel.roles = panel.roles.filter((r) => r.roleId !== roleId);
  save(data);
  await refreshPanel(client, panel);
  return panel;
}

module.exports = {
  handleCommand,
  handleButton,
  createPanelInChannel,
  listPanels,
  addRoleToPanel,
  removeRoleFromPanel,
};
