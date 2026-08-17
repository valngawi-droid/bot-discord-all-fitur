// ==========================================
// Fitur Store — buka/tutup, produk, payment
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const db = require("../lib/db");
const { isAdmin, isStaff, deny } = require("../lib/permissions");
const { COLORS, rupiah, embed, respond, slug } = require("../lib/util");

const DEFAULTS = () => ({
  name: "Store",
  open: false,
  channelId: null,
  ticketCategoryId: null,
  staffRoleId: null,
  ownerId: null,
  hoursOpen: "09:00",
  hoursClose: "21:00",
  products: [],
  payments: [],
  nextProductId: 1,
});

function getConfig(guildId) {
  return db.guildBucket("store", guildId, DEFAULTS);
}

function saveConfig(guildId, cfg) {
  db.saveGuild("store", guildId, cfg);
  return cfg;
}

function hoursText(cfg) {
  return `${cfg.hoursOpen || "09:00"} — ${cfg.hoursClose || "21:00"}`;
}

function productLines(cfg, limit = 8) {
  if (!cfg.products.length) return "_Belum ada produk. Admin: `/produk add`_";
  return cfg.products
    .slice(0, limit)
    .map((p) => {
      const stok = p.stock < 0 ? "∞" : String(p.stock);
      return `• **${p.name}** — ${rupiah(p.price)} · stok \`${stok}\``;
    })
    .join("\n");
}

function paymentLines(cfg) {
  if (!cfg.payments.length) return "_Belum ada metode pembayaran. Admin: `/payment add`_";
  return cfg.payments
    .map((p) => `• **${p.method}** \`${p.number}\`${p.holder ? ` a.n. ${p.holder}` : ""}`)
    .join("\n");
}

function storeButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("store_order")
      .setLabel("Buat Pesanan")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("store_products")
      .setLabel("Lihat Produk")
      .setEmoji("📦")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("store_payment")
      .setLabel("Payment")
      .setEmoji("💳")
      .setStyle(ButtonStyle.Secondary)
  );
}

function statusEmbed(cfg, extra = "") {
  const open = !!cfg.open;
  return embed({
    color: open ? COLORS.green : COLORS.red,
    title: open ? `🟢 ${cfg.name} BUKA` : `🔴 ${cfg.name} TUTUP`,
    description: [
      open
        ? "Toko sedang **BUKA**. Silakan order lewat tombol di bawah atau `/buy`."
        : "Toko sedang **TUTUP**. Silakan kembali lagi sesuai jam operasional.",
      extra ? `\n${extra}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    fields: [
      { name: "⏰ Jam Operasional", value: hoursText(cfg), inline: true },
      {
        name: "👑 Owner",
        value: cfg.ownerId ? `<@${cfg.ownerId}>` : "—",
        inline: true,
      },
      {
        name: "📦 Produk",
        value: `${cfg.products.length} item`,
        inline: true,
      },
    ],
    footer: `${cfg.name} • ketik /store info`,
  });
}

function infoEmbed(cfg) {
  return embed({
    color: cfg.open ? COLORS.green : COLORS.gold,
    title: `🏪 ${cfg.name}`,
    description: cfg.open
      ? "Status: **🟢 BUKA** — ready order!"
      : "Status: **🔴 TUTUP** — tunggu buka ya.",
    fields: [
      { name: "⏰ Jam", value: hoursText(cfg), inline: true },
      {
        name: "👑 Owner",
        value: cfg.ownerId ? `<@${cfg.ownerId}>` : "Belum diatur",
        inline: true,
      },
      {
        name: "🛡️ Staff",
        value: cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : "Belum diatur",
        inline: true,
      },
      { name: "📦 Produk", value: productLines(cfg, 10) },
      { name: "💳 Payment", value: paymentLines(cfg) },
    ],
    footer: "Gunakan /buy <produk> untuk memesan",
  });
}

async function announce(interaction, cfg, payload) {
  const channelId = cfg.channelId;
  const channel =
    (channelId && interaction.guild.channels.cache.get(channelId)) ||
    interaction.channel;
  if (!channel || !channel.isTextBased()) {
    return respond(interaction, {
      content: "❌ Channel store tidak valid. Atur dulu dengan `/store set-channel`.",
      ephemeral: true,
    });
  }
  const sent = await channel.send(payload);
  if (interaction.channelId === channel.id) {
    return respond(interaction, { content: "✅ Pengumuman dikirim.", ephemeral: true });
  }
  return respond(interaction, {
    content: `✅ Pengumuman dikirim ke ${channel}.`,
    ephemeral: true,
  });
}

function mentionText(choice) {
  if (choice === "everyone") return "@everyone";
  if (choice === "here") return "@here";
  return null;
}

async function handleCommand(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  if (!guildId) {
    return respond(interaction, { content: "❌ Command ini hanya untuk server.", ephemeral: true });
  }
  const cfg = getConfig(guildId);

  const publicSubs = new Set(["status", "info"]);
  if (!publicSubs.has(sub) && !isAdmin(interaction)) {
    return deny(interaction);
  }

  if (sub === "status") {
    return respond(interaction, {
      embeds: [statusEmbed(cfg)],
      components: [storeButtons()],
    });
  }

  if (sub === "info") {
    return respond(interaction, {
      embeds: [infoEmbed(cfg)],
      components: [storeButtons()],
    });
  }

  if (sub === "buka") {
    cfg.open = true;
    saveConfig(guildId, cfg);
    const extra = interaction.options.getString("pesan");
    const mention = mentionText(interaction.options.getString("mention"));
    const e = statusEmbed(cfg, extra);
    return announce(interaction, cfg, {
      content: mention || undefined,
      embeds: [e],
      components: [storeButtons()],
    });
  }

  if (sub === "tutup") {
    cfg.open = false;
    saveConfig(guildId, cfg);
    const extra = interaction.options.getString("pesan");
    const mention = mentionText(interaction.options.getString("mention"));
    const e = statusEmbed(cfg, extra);
    return announce(interaction, cfg, {
      content: mention || undefined,
      embeds: [e],
    });
  }

  if (sub === "restock") {
    const item = interaction.options.getString("item");
    const jumlah = interaction.options.getInteger("jumlah") ?? 0;
    const pesan = interaction.options.getString("pesan");
    const product = findProduct(cfg, item);
    if (product) {
      if (product.stock < 0) product.stock = jumlah;
      else product.stock += jumlah;
      saveConfig(guildId, cfg);
    }
    const e = embed({
      color: COLORS.gold,
      title: `📦 RESTOCK ${cfg.name}`,
      description: [
        product
          ? `**${product.name}** restock **+${jumlah}** (stok sekarang: **${product.stock < 0 ? "∞" : product.stock}**)`
          : `Item: **${item}**${jumlah ? ` · +${jumlah}` : ""}`,
        pesan ? `\n${pesan}` : "",
        "",
        "Buruan order sebelum kehabisan!",
      ].join("\n"),
      footer: cfg.open ? "Store sedang BUKA" : "Store masih TUTUP — stay tune",
    });
    return announce(interaction, cfg, {
      embeds: [e],
      components: [storeButtons()],
    });
  }

  if (sub === "promo") {
    const pesan = interaction.options.getString("pesan");
    const judul = interaction.options.getString("judul") || `🔥 PROMO ${cfg.name}`;
    const mention = mentionText(interaction.options.getString("mention"));
    const e = embed({
      color: COLORS.pink,
      title: judul,
      description: pesan,
      footer: cfg.open ? "Store BUKA — order sekarang" : "Store TUTUP — buruan pas buka",
    });
    return announce(interaction, cfg, {
      content: mention || undefined,
      embeds: [e],
      components: [storeButtons()],
    });
  }

  if (sub === "set-channel") {
    const ch = interaction.options.getChannel("channel");
    if (!ch || ch.type !== ChannelType.GuildText) {
      return respond(interaction, { content: "❌ Pilih text channel.", ephemeral: true });
    }
    cfg.channelId = ch.id;
    saveConfig(guildId, cfg);
    return respond(interaction, {
      content: `✅ Channel pengumuman store: ${ch}`,
      ephemeral: true,
    });
  }

  if (sub === "set-nama") {
    cfg.name = interaction.options.getString("nama");
    saveConfig(guildId, cfg);
    return respond(interaction, { content: `✅ Nama toko: **${cfg.name}**`, ephemeral: true });
  }

  if (sub === "set-jam") {
    cfg.hoursOpen = interaction.options.getString("buka");
    cfg.hoursClose = interaction.options.getString("tutup");
    saveConfig(guildId, cfg);
    return respond(interaction, {
      content: `✅ Jam operasional: **${hoursText(cfg)}**`,
      ephemeral: true,
    });
  }

  if (sub === "set-staff") {
    const role = interaction.options.getRole("role");
    cfg.staffRoleId = role.id;
    saveConfig(guildId, cfg);
    return respond(interaction, {
      content: `✅ Role staff toko: ${role}`,
      ephemeral: true,
    });
  }

  if (sub === "set-kategori") {
    const cat = interaction.options.getChannel("kategori");
    if (!cat || cat.type !== ChannelType.GuildCategory) {
      return respond(interaction, { content: "❌ Pilih category channel.", ephemeral: true });
    }
    cfg.ticketCategoryId = cat.id;
    saveConfig(guildId, cfg);
    return respond(interaction, {
      content: `✅ Kategori ticket: **${cat.name}**`,
      ephemeral: true,
    });
  }

  if (sub === "set-owner") {
    const user = interaction.options.getUser("user");
    cfg.ownerId = user.id;
    saveConfig(guildId, cfg);
    return respond(interaction, {
      content: `✅ Owner toko: ${user}`,
      ephemeral: true,
    });
  }

  return respond(interaction, { content: "❌ Subcommand tidak dikenal.", ephemeral: true });
}

function findProduct(cfg, query) {
  if (!query) return null;
  const q = String(query).toLowerCase();
  return (
    cfg.products.find((p) => p.id === query) ||
    cfg.products.find((p) => p.name.toLowerCase() === q) ||
    cfg.products.find((p) => p.name.toLowerCase().includes(q))
  );
}

async function handleProduk(interaction) {
  if (!interaction.guildId) {
    return respond(interaction, { content: "❌ Hanya untuk server.", ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();
  const cfg = getConfig(interaction.guildId);

  if (sub === "list") {
    return respond(interaction, {
      embeds: [
        embed({
          color: COLORS.teal,
          title: `📦 Produk ${cfg.name}`,
          description: productLines(cfg, 25),
          footer: `${cfg.products.length} produk · /buy untuk pesan`,
        }),
      ],
      components: [storeButtons()],
    });
  }

  if (!isAdmin(interaction)) return deny(interaction);

  if (sub === "add") {
    const name = interaction.options.getString("nama");
    const price = interaction.options.getInteger("harga");
    const stock = interaction.options.getInteger("stok");
    const description = interaction.options.getString("deskripsi") || "";
    if (cfg.products.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return respond(interaction, { content: "❌ Produk dengan nama itu sudah ada.", ephemeral: true });
    }
    const item = {
      id: `${slug(name)}-${cfg.nextProductId++}`,
      name,
      price,
      stock: stock == null ? -1 : stock,
      description,
    };
    cfg.products.push(item);
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      embeds: [
        embed({
          color: COLORS.green,
          title: "✅ Produk ditambahkan",
          fields: [
            { name: "Nama", value: item.name, inline: true },
            { name: "Harga", value: rupiah(item.price), inline: true },
            { name: "Stok", value: item.stock < 0 ? "∞" : String(item.stock), inline: true },
            ...(item.description ? [{ name: "Deskripsi", value: item.description }] : []),
          ],
        }),
      ],
      ephemeral: true,
    });
  }

  if (sub === "hapus") {
    const q = interaction.options.getString("nama");
    const item = findProduct(cfg, q);
    if (!item) return respond(interaction, { content: "❌ Produk tidak ditemukan.", ephemeral: true });
    cfg.products = cfg.products.filter((p) => p.id !== item.id);
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, { content: `🗑️ Produk **${item.name}** dihapus.`, ephemeral: true });
  }

  if (sub === "edit") {
    const q = interaction.options.getString("nama");
    const item = findProduct(cfg, q);
    if (!item) return respond(interaction, { content: "❌ Produk tidak ditemukan.", ephemeral: true });
    const harga = interaction.options.getInteger("harga");
    const stok = interaction.options.getInteger("stok");
    const deskripsi = interaction.options.getString("deskripsi");
    const namaBaru = interaction.options.getString("nama_baru");
    if (harga != null) item.price = harga;
    if (stok != null) item.stock = stok;
    if (deskripsi != null) item.description = deskripsi;
    if (namaBaru) item.name = namaBaru;
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      content: `✅ **${item.name}** diperbarui · ${rupiah(item.price)} · stok ${item.stock < 0 ? "∞" : item.stock}`,
      ephemeral: true,
    });
  }
}

async function handlePayment(interaction) {
  if (!interaction.guildId) {
    return respond(interaction, { content: "❌ Hanya untuk server.", ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();
  const cfg = getConfig(interaction.guildId);

  if (sub === "list") {
    return respond(interaction, {
      embeds: [
        embed({
          color: COLORS.blurple,
          title: `💳 Payment ${cfg.name}`,
          description: paymentLines(cfg),
        }),
      ],
    });
  }

  if (!isAdmin(interaction)) return deny(interaction);

  if (sub === "add") {
    const method = interaction.options.getString("metode");
    const number = interaction.options.getString("nomor");
    const holder = interaction.options.getString("atas_nama") || "";
    if (cfg.payments.some((p) => p.method.toLowerCase() === method.toLowerCase())) {
      return respond(interaction, { content: "❌ Metode itu sudah ada. Hapus dulu atau ganti nama.", ephemeral: true });
    }
    cfg.payments.push({ method, number, holder });
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, {
      content: `✅ Payment **${method}** \`${number}\`${holder ? ` a.n. ${holder}` : ""} ditambahkan.`,
      ephemeral: true,
    });
  }

  if (sub === "hapus") {
    const method = interaction.options.getString("metode");
    const before = cfg.payments.length;
    cfg.payments = cfg.payments.filter((p) => p.method.toLowerCase() !== method.toLowerCase());
    if (cfg.payments.length === before) {
      return respond(interaction, { content: "❌ Metode tidak ditemukan.", ephemeral: true });
    }
    saveConfig(interaction.guildId, cfg);
    return respond(interaction, { content: `🗑️ Payment **${method}** dihapus.`, ephemeral: true });
  }
}

async function handleBuy(interaction, tickets) {
  const cfg = getConfig(interaction.guildId);
  if (!cfg.open && !isStaff(interaction, cfg.staffRoleId)) {
    return respond(interaction, {
      content: `🔴 **${cfg.name}** sedang TUTUP. Jam operasional: **${hoursText(cfg)}**`,
      ephemeral: true,
    });
  }
  const query = interaction.options.getString("produk");
  const jumlah = interaction.options.getInteger("jumlah") || 1;
  const item = findProduct(cfg, query);
  if (!item) {
    return respond(interaction, {
      content: "❌ Produk tidak ditemukan. Lihat daftar: `/produk list`",
      ephemeral: true,
    });
  }
  if (item.stock >= 0 && item.stock < jumlah) {
    return respond(interaction, {
      content: `❌ Stok **${item.name}** tidak cukup (tersisa ${item.stock}).`,
      ephemeral: true,
    });
  }
  const note = [
    `Pesanan: **${item.name}** × ${jumlah}`,
    `Harga satuan: ${rupiah(item.price)}`,
    `Total: **${rupiah(item.price * jumlah)}**`,
    item.description ? `Catatan: ${item.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return tickets.createTicket(interaction, {
    type: "pesanan",
    extra: note,
    product: { id: item.id, qty: jumlah },
  });
}

async function handleButton(interaction, tickets) {
  const cfg = getConfig(interaction.guildId);
  const id = interaction.customId;

  if (id === "store_products") {
    return interaction.reply({
      embeds: [
        embed({
          color: COLORS.teal,
          title: `📦 Produk ${cfg.name}`,
          description: productLines(cfg, 25),
        }),
      ],
      ephemeral: true,
    });
  }

  if (id === "store_payment") {
    return interaction.reply({
      embeds: [
        embed({
          color: COLORS.blurple,
          title: `💳 Payment ${cfg.name}`,
          description: paymentLines(cfg),
        }),
      ],
      ephemeral: true,
    });
  }

  if (id === "store_order") {
    if (!cfg.open && !isStaff(interaction, cfg.staffRoleId)) {
      return interaction.reply({
        content: `🔴 **${cfg.name}** sedang TUTUP. Jam: **${hoursText(cfg)}**`,
        ephemeral: true,
      });
    }
    return tickets.createTicket(interaction, { type: "pesanan" });
  }
}

function autocompleteProduk(interaction) {
  const cfg = getConfig(interaction.guildId);
  const focused = (interaction.options.getFocused() || "").toLowerCase();
  const choices = cfg.products
    .filter((p) => p.name.toLowerCase().includes(focused) || p.id.includes(focused))
    .slice(0, 25)
    .map((p) => ({
      name: `${p.name} — ${rupiah(p.price)}`.slice(0, 100),
      value: p.id,
    }));
  return interaction.respond(choices);
}

function consumeStock(guildId, productId, qty) {
  const cfg = getConfig(guildId);
  const item = cfg.products.find((p) => p.id === productId);
  if (!item) return null;
  if (item.stock >= 0) item.stock = Math.max(0, item.stock - qty);
  saveConfig(guildId, cfg);
  return item;
}

module.exports = {
  getConfig,
  saveConfig,
  findProduct,
  handleCommand,
  handleProduk,
  handlePayment,
  handleBuy,
  handleButton,
  autocompleteProduk,
  consumeStock,
  statusEmbed,
  infoEmbed,
};
