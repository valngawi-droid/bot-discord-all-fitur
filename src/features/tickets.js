// ==========================================
// Sistem Ticket — buat channel privat pesanan
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require("discord.js");
const db = require("../lib/db");
const { isAdmin, isStaff, deny } = require("../lib/permissions");
const { COLORS, embed, respond } = require("../lib/util");
const store = require("./store");

const TYPES = {
  pesanan: { label: "Pesanan", emoji: "🛒", color: COLORS.green },
  support: { label: "Support", emoji: "💬", color: COLORS.blurple },
  komplain: { label: "Komplain", emoji: "⚠️", color: COLORS.orange },
};

function data() {
  return db.load("tickets", { open: {}, counters: {} });
}

function save(all) {
  db.save("tickets", all);
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim")
      .setEmoji("✋")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Tutup Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
}

function panelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create:pesanan")
      .setLabel("Pesanan")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_create:support")
      .setLabel("Support")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_create:komplain")
      .setLabel("Komplain")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Secondary)
  );
}

function findOpenByUser(all, guildId, userId, type) {
  return Object.entries(all.open).find(
    ([, t]) => t.guildId === guildId && t.userId === userId && t.type === type && !t.closed
  );
}

async function createTicket(interaction, { type = "pesanan", extra = "", product = null } = {}) {
  const guild = interaction.guild;
  if (!guild) {
    return respond(interaction, { content: "❌ Hanya bisa di server.", ephemeral: true });
  }

  const meta = TYPES[type] || TYPES.pesanan;
  const cfg = store.getConfig(guild.id);
  const all = data();

  const existing = findOpenByUser(all, guild.id, interaction.user.id, type);
  if (existing) {
    return respond(interaction, {
      content: `❌ Kamu masih punya ticket ${meta.label} terbuka: <#${existing[0]}>`,
      ephemeral: true,
    });
  }

  const me = guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return respond(interaction, {
      content: "❌ Bot tidak punya izin **Manage Channels**. Minta admin berikan izin itu.",
      ephemeral: true,
    });
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  all.counters[guild.id] = (all.counters[guild.id] || 0) + 1;
  const num = all.counters[guild.id];
  const uname = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";
  const name = `ticket-${type}-${uname}-${num}`.slice(0, 90);

  const overwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];
  if (cfg.staffRoleId) {
    overwrites.push({
      id: cfg.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  let parent = cfg.ticketCategoryId || null;
  if (parent && !guild.channels.cache.get(parent)) parent = null;

  let channel;
  try {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent,
      permissionOverwrites: overwrites,
      topic: `${meta.label} • ${interaction.user.tag} • ${interaction.user.id}`,
    });
  } catch (err) {
    return respond(interaction, {
      content: `❌ Gagal membuat channel ticket: \`${err.message}\``,
    });
  }

  all.open[channel.id] = {
    guildId: guild.id,
    userId: interaction.user.id,
    type,
    claimedBy: null,
    createdAt: Date.now(),
    product,
    closed: false,
    number: num,
  };
  save(all);

  const staffPing = cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : "";
  await channel.send({
    content: `${meta.emoji} ${interaction.user} ${staffPing}`.trim(),
    embeds: [
      embed({
        color: meta.color,
        title: `${meta.emoji} Ticket ${meta.label} #${num}`,
        description: [
          `Halo ${interaction.user}, ticket kamu sudah dibuat.`,
          "Staff akan segera merespons. Jelaskan kebutuhanmu di sini.",
          extra ? `\n${extra}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        fields: [
          { name: "Pembuat", value: `${interaction.user}`, inline: true },
          { name: "Jenis", value: meta.label, inline: true },
          { name: "Toko", value: cfg.open ? "🟢 BUKA" : "🔴 TUTUP", inline: true },
        ],
        footer: "Tombol Tutup Ticket untuk menyelesaikan",
      }),
    ],
    components: [ticketButtons()],
  });

  return respond(interaction, {
    content: `✅ Ticket dibuat: ${channel}`,
  });
}

async function buildTranscript(channel) {
  try {
    const collected = [];
    let lastId;
    for (let i = 0; i < 5; i++) {
      const batch = await channel.messages.fetch({ limit: 100, before: lastId });
      if (!batch.size) break;
      collected.push(...batch.values());
      lastId = batch.last().id;
      if (batch.size < 100) break;
    }
    collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const lines = collected.map((m) => {
      const time = new Date(m.createdTimestamp).toISOString();
      const text = m.cleanContent || (m.embeds[0]?.title ? `[embed] ${m.embeds[0].title}` : "");
      return `[${time}] ${m.author.tag}: ${text}`;
    });
    const body = `Transcript #${channel.name}\n${"=".repeat(40)}\n${lines.join("\n") || "(kosong)"}\n`;
    return new AttachmentBuilder(Buffer.from(body, "utf8"), {
      name: `${channel.name}.txt`,
    });
  } catch {
    return null;
  }
}

async function closeTicket(interaction, reason = "") {
  const channel = interaction.channel;
  const all = data();
  const ticket = all.open[channel.id];
  if (!ticket) {
    return respond(interaction, {
      content: "❌ Channel ini bukan ticket.",
      ephemeral: true,
    });
  }

  const cfg = store.getConfig(interaction.guildId);
  const staff = isStaff(interaction, cfg.staffRoleId);
  if (!staff && interaction.user.id !== ticket.userId) {
    return deny(interaction, "❌ Hanya pembuat ticket atau staff yang bisa menutup.");
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  ticket.closed = true;
  ticket.closedBy = interaction.user.id;
  ticket.closedAt = Date.now();
  ticket.reason = reason;
  save(all);

  if (ticket.product && ticket.product.id) {
    store.consumeStock(interaction.guildId, ticket.product.id, ticket.product.qty || 1);
  }

  const file = await buildTranscript(channel);
  const closing = embed({
    color: COLORS.red,
    title: "🔒 Ticket ditutup",
    description: [
      `Ditutup oleh ${interaction.user}`,
      reason ? `Alasan: ${reason}` : "",
      "Channel akan dihapus dalam **10 detik**.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  await respond(interaction, { embeds: [closing], files: file ? [file] : [] });

  try {
    const opener = await interaction.client.users.fetch(ticket.userId).catch(() => null);
    if (opener) {
      await opener
        .send({
          embeds: [
            embed({
              color: COLORS.orange,
              title: "🔒 Ticket kamu ditutup",
              description: `Ticket **${channel.name}** di **${interaction.guild.name}** sudah ditutup.${reason ? `\nAlasan: ${reason}` : ""}`,
            }),
          ],
          files: file ? [file] : [],
        })
        .catch(() => {});
    }
  } catch {
    /* ignore DM fail */
  }

  setTimeout(() => {
    const latest = data();
    delete latest.open[channel.id];
    save(latest);
    channel.delete("Ticket ditutup").catch(() => {});
  }, 10000);
}

async function handleCommand(interaction) {
  if (!interaction.guild) {
    return respond(interaction, { content: "❌ Command ticket hanya untuk server.", ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();
  const cfg = store.getConfig(interaction.guildId);

  if (sub === "setup") {
    if (!isAdmin(interaction)) return deny(interaction);
    const judul = interaction.options.getString("judul") || "🎫 Buat Ticket";
    const deskripsi =
      interaction.options.getString("deskripsi") ||
      "Pilih jenis bantuan di bawah. Satu ticket terbuka per jenis.";
    const kategori = interaction.options.getChannel("kategori");
    if (kategori && kategori.type === ChannelType.GuildCategory) {
      cfg.ticketCategoryId = kategori.id;
      store.saveConfig(interaction.guildId, cfg);
    }
    await interaction.channel.send({
      embeds: [
        embed({
          color: COLORS.teal,
          title: judul,
          description: deskripsi,
          fields: [
            { name: "🛒 Pesanan", value: "Order produk / jasa toko", inline: true },
            { name: "💬 Support", value: "Tanya stok, cara order, dll", inline: true },
            { name: "⚠️ Komplain", value: "Kendala transaksi", inline: true },
          ],
          footer: `${cfg.name} • klik tombol untuk membuat channel privat`,
        }),
      ],
      components: [panelButtons()],
    });
    return respond(interaction, { content: "✅ Panel ticket dipasang di channel ini.", ephemeral: true });
  }

  if (sub === "close") {
    const alasan = interaction.options.getString("alasan") || "";
    return closeTicket(interaction, alasan);
  }

  if (sub === "add" || sub === "remove") {
    const all = data();
    const ticket = all.open[interaction.channel.id];
    if (!ticket) {
      return respond(interaction, { content: "❌ Ini bukan channel ticket.", ephemeral: true });
    }
    if (!isStaff(interaction, cfg.staffRoleId) && interaction.user.id !== ticket.userId) {
      return deny(interaction);
    }
    const user = interaction.options.getUser("user");
    try {
      if (sub === "add") {
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
        });
        return respond(interaction, { content: `✅ ${user} ditambahkan ke ticket.` });
      }
      await interaction.channel.permissionOverwrites.delete(user.id);
      return respond(interaction, { content: `✅ ${user} dikeluarkan dari ticket.` });
    } catch (err) {
      return respond(interaction, { content: `❌ ${err.message}`, ephemeral: true });
    }
  }

  if (sub === "claim") {
    return claimTicket(interaction);
  }

  if (sub === "rename") {
    const all = data();
    const ticket = all.open[interaction.channel.id];
    if (!ticket) {
      return respond(interaction, { content: "❌ Ini bukan channel ticket.", ephemeral: true });
    }
    if (!isStaff(interaction, cfg.staffRoleId)) return deny(interaction);
    const nama = interaction.options.getString("nama");
    const safe = nama.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);
    await interaction.channel.setName(safe).catch(() => {});
    return respond(interaction, { content: `✅ Channel diubah menjadi \`#${safe}\`` });
  }
}

async function claimTicket(interaction) {
  const cfg = store.getConfig(interaction.guildId);
  if (!isStaff(interaction, cfg.staffRoleId)) {
    return deny(interaction, "❌ Hanya staff yang bisa claim ticket.");
  }
  const all = data();
  const ticket = all.open[interaction.channel.id];
  if (!ticket) {
    return respond(interaction, { content: "❌ Ini bukan channel ticket.", ephemeral: true });
  }
  if (ticket.claimedBy) {
    return respond(interaction, {
      content: `ℹ️ Ticket sudah di-claim oleh <@${ticket.claimedBy}>.`,
      ephemeral: true,
    });
  }
  ticket.claimedBy = interaction.user.id;
  save(all);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.blurple,
        title: "✋ Ticket di-claim",
        description: `${interaction.user} menangani ticket ini.`,
      }),
    ],
  });
}

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith("ticket_create:")) {
    const type = id.split(":")[1];
    return createTicket(interaction, { type });
  }

  if (id === "ticket_close") {
    return interaction.reply({
      embeds: [
        embed({
          color: COLORS.orange,
          title: "Tutup ticket ini?",
          description: "Channel akan dihapus dalam 10 detik setelah dikonfirmasi. Transcript dikirim ke DM pembuat.",
        }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_close_confirm")
            .setLabel("Ya, tutup")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("ticket_close_cancel")
            .setLabel("Batal")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
      ephemeral: true,
    });
  }

  if (id === "ticket_close_confirm") {
    return closeTicket(interaction, "Ditutup via tombol");
  }

  if (id === "ticket_close_cancel") {
    return interaction.update({ content: "Dibatalkan.", embeds: [], components: [] });
  }

  if (id === "ticket_claim") {
    return claimTicket(interaction);
  }
}

async function postPanel(channel, { title, description } = {}) {
  const cfg = store.getConfig(channel.guild.id);
  return channel.send({
    embeds: [
      embed({
        color: COLORS.violet || 0xa78bfa,
        title: title || "🎫 Buat Ticket",
        description:
          description || "Pilih jenis bantuan di bawah. Satu ticket terbuka per jenis.",
        fields: [
          { name: "🛒 Pesanan", value: "Order produk / jasa toko", inline: true },
          { name: "💬 Support", value: "Tanya stok, cara order, dll", inline: true },
          { name: "⚠️ Komplain", value: "Kendala transaksi", inline: true },
        ],
        footer: `${cfg.name} · X Community`,
      }),
    ],
    components: [panelButtons()],
  });
}

function listOpen(guildId) {
  const all = data();
  return Object.entries(all.open)
    .filter(([, t]) => t.guildId === guildId && !t.closed)
    .map(([channelId, t]) => ({ channelId, ...t }));
}

module.exports = {
  createTicket,
  handleCommand,
  handleButton,
  closeTicket,
  postPanel,
  listOpen,
};
