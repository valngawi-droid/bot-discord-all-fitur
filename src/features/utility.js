// ==========================================
// Utilitas: help, ping, avatar, info, poll
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { COLORS, embed, respond } = require("../lib/util");

const HELP = {
  store: {
    label: "🏪 Store",
    text: [
      "`/store buka` `/store tutup` — Status toko + pengumuman",
      "`/store status` `/store info` — Cek toko",
      "`/store restock` `/store promo` — Restock & promo",
      "`/store set-channel` `set-nama` `set-jam` `set-staff` `set-kategori` `set-owner`",
      "`/produk add|edit|hapus|list` — Katalog",
      "`/payment add|hapus|list` — Metode bayar",
      "`/buy` — Pesan produk (buka ticket)",
    ].join("\n"),
  },
  ticket: {
    label: "🎫 Ticket",
    text: [
      "`/ticket setup` — Pasang panel tombol buat ticket",
      "`/ticket close` — Tutup ticket + transcript",
      "`/ticket claim` — Staff ambil alih",
      "`/ticket add` `/ticket remove` — Atur member di ticket",
      "`/ticket rename` — Ganti nama channel",
    ].join("\n"),
  },
  role: {
    label: "🎭 Take Role",
    text: [
      "`/takerole panel` — Buat pesan tombol role",
      "`/takerole add` — Tambah role ke panel",
      "`/takerole hapus` — Hapus role dari panel",
      "`/takerole list` — Lihat semua panel",
    ].join("\n"),
  },
  welcome: {
    label: "👋 Welcome / Goodbye",
    text: [
      "`/welcome channel` `pesan` `banner` `warna` `on` `off` `test`",
      "`/goodbye channel` `pesan` `banner` `warna` `on` `off` `test`",
      "Placeholder: `{user}` `{user.tag}` `{user.mention}` `{server}` `{membercount}`",
      "Setup lengkap juga lewat dashboard website.",
    ].join("\n"),
  },
  community: {
    label: "✨ Komunitas",
    text: [
      "`/rank` `/levels` — XP & peringkat",
      "`/suggest` — Kirim saran + vote",
      "`/giveaway start` `end` — Giveaway tombol",
      "`/afk` — Tandai sedang AFK",
      "`/announce` — Pengumuman embed",
      "`/verify` — Panel verifikasi",
    ].join("\n"),
  },
  game: {
    label: "🎮 Game",
    text: [
      "`/tictactoe` `/suit` `/slot` `/dadu` `/coinflip`",
      "`/tebakangka` `/tebakkata` `/tebakbendera`",
      "`/caklontong` `/math` `/siapakahaku` `/hangman`",
      "Kuis: klik **Tebak** atau ketik jawaban di chat.",
    ].join("\n"),
  },
  economy: {
    label: "💰 Ekonomi",
    text: [
      "`/balance` — Cek koin",
      "`/daily` — Klaim harian",
      "`/work` — Kerja tiap 1 jam",
      "`/transfer` — Kirim koin",
      "`/leaderboard` — Top koin server",
      "`/givekoin` — Admin tambah/kurang koin",
    ].join("\n"),
  },
  util: {
    label: "🛠️ Utilitas",
    text: [
      "`/ping` `/help` `/avatar` `/userinfo` `/serverinfo` `/poll`",
    ].join("\n"),
  },
};

function helpEmbed(key = "store") {
  const item = HELP[key] || HELP.store;
  return embed({
    color: COLORS.teal,
    title: `📖 Bantuan — ${item.label}`,
    description: item.text,
    footer: "X Community",
  });
}

function helpMenu(selected = "store") {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("Pilih kategori bantuan")
      .addOptions(
        Object.entries(HELP).map(([value, v]) => ({
          label: v.label,
          value,
          default: value === selected,
        }))
      )
  );
}

async function handleHelp(interaction) {
  return respond(interaction, {
    embeds: [helpEmbed("store")],
    components: [helpMenu("store")],
  });
}

async function handlePing(interaction, client) {
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.green,
        title: "🏓 Pong!",
        description: `Latensi WebSocket: **${client.ws.ping}ms**`,
      }),
    ],
  });
}

async function handleAvatar(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const url = user.displayAvatarURL({ size: 512, extension: "png" });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.blurple,
        title: `Avatar ${user.tag || user.username}`,
        image: url,
        description: `[Buka gambar](${url})`,
      }),
    ],
  });
}

async function handleUserInfo(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const roles = member
    ? member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())
        .slice(0, 15)
        .join(" ") || "—"
    : "—";
  return respond(interaction, {
    embeds: [
      embed({
        color: member?.displayColor || COLORS.blurple,
        title: user.tag || user.username,
        thumbnail: user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: "ID", value: user.id, inline: true },
          { name: "Bot", value: user.bot ? "Ya" : "Tidak", inline: true },
          {
            name: "Akun dibuat",
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: "Join server",
            value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "—",
            inline: true,
          },
          { name: "Role", value: roles },
        ],
      }),
    ],
  });
}

async function handleServerInfo(interaction) {
  const g = interaction.guild;
  await g.members.fetch().catch(() => {});
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.teal,
        title: g.name,
        thumbnail: g.iconURL({ size: 256 }),
        fields: [
          { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
          { name: "Member", value: String(g.memberCount), inline: true },
          { name: "Channel", value: String(g.channels.cache.size), inline: true },
          { name: "Role", value: String(g.roles.cache.size), inline: true },
          { name: "Boost", value: `Level ${g.premiumTier} · ${g.premiumSubscriptionCount || 0}`, inline: true },
          {
            name: "Dibuat",
            value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
            inline: true,
          },
        ],
        footer: `ID: ${g.id}`,
      }),
    ],
  });
}

const polls = new Map();

async function handlePoll(interaction) {
  const q = interaction.options.getString("pertanyaan");
  const opts = ["opsi1", "opsi2", "opsi3", "opsi4", "opsi5"]
    .map((k) => interaction.options.getString(k))
    .filter(Boolean);
  if (opts.length < 2) {
    return respond(interaction, { content: "Minimal 2 opsi.", ephemeral: true });
  }
  const id = `${interaction.id}`;
  polls.set(id, { votes: opts.map(() => new Set()), voters: new Map() });
  const rows = [];
  for (let i = 0; i < opts.length; i += 5) {
    const row = new ActionRowBuilder();
    opts.slice(i, i + 5).forEach((label, idx) => {
      const n = i + idx;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll:${id}:${n}`)
          .setLabel(`${n + 1}. ${label}`.slice(0, 80))
          .setStyle(ButtonStyle.Secondary)
      );
    });
    rows.push(row);
  }
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: "📊 Poll",
        description: `**${q}**\n\n${opts.map((o, i) => `**${i + 1}.** ${o} — 0`).join("\n")}`,
        footer: `Dibuat oleh ${interaction.user.tag}`,
      }),
    ],
    components: rows,
  });
}

async function handlePollButton(interaction) {
  const [, id, idxStr] = interaction.customId.split(":");
  const poll = polls.get(id);
  if (!poll) {
    return interaction.reply({ content: "Poll ini sudah tidak aktif (restart bot).", ephemeral: true });
  }
  const idx = parseInt(idxStr, 10);
  const prev = poll.voters.get(interaction.user.id);
  if (prev != null) poll.votes[prev].delete(interaction.user.id);
  poll.votes[idx].add(interaction.user.id);
  poll.voters.set(interaction.user.id, idx);

  const old = interaction.message.embeds[0];
  const lines = old.description.split("\n");
  const titleLine = lines[0];
  const optionLines = [];
  const labels = interaction.message.components.flatMap((r) =>
    r.components.map((c) => c.label.replace(/^\d+\.\s/, "").replace(/\s·.*$/, ""))
  );
  labels.forEach((label, i) => {
    optionLines.push(`**${i + 1}.** ${label} — ${poll.votes[i].size}`);
  });
  const e = embed({
    color: COLORS.gold,
    title: old.title,
    description: `${titleLine}\n\n${optionLines.join("\n")}`,
    footer: old.footer?.text,
  });
  await interaction.update({ embeds: [e] });
}

async function handleHelpSelect(interaction) {
  const key = interaction.values[0];
  return interaction.update({
    embeds: [helpEmbed(key)],
    components: [helpMenu(key)],
  });
}

module.exports = {
  handleHelp,
  handlePing,
  handleAvatar,
  handleUserInfo,
  handleServerInfo,
  handlePoll,
  handlePollButton,
  handleHelpSelect,
};
