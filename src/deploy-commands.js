// ==========================================
// Daftarkan Slash Commands ke Discord
// Jalankan: npm run deploy-commands
// ==========================================
require("dotenv").config();
process.env.BOT_TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN || "";
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");
const mentionChoices = [
  { name: "Tidak ada", value: "none" },
  { name: "@here", value: "here" },
  { name: "@everyone", value: "everyone" },
];

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("🏓 Cek status bot"),
  new SlashCommandBuilder().setName("help").setDescription("📖 Bantuan X Community"),

  // ===== STORE =====
  new SlashCommandBuilder()
    .setName("store")
    .setDescription("🏪 Kelola toko (buka/tutup, restock, pengaturan)")
    .addSubcommand((s) =>
      s
        .setName("buka")
        .setDescription("Buka toko dan kirim pengumuman")
        .addStringOption((o) => o.setName("pesan").setDescription("Pesan tambahan"))
        .addStringOption((o) =>
          o.setName("mention").setDescription("Mention").addChoices(...mentionChoices)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("tutup")
        .setDescription("Tutup toko dan kirim pengumuman")
        .addStringOption((o) => o.setName("pesan").setDescription("Pesan tambahan"))
        .addStringOption((o) =>
          o.setName("mention").setDescription("Mention").addChoices(...mentionChoices)
        )
    )
    .addSubcommand((s) => s.setName("status").setDescription("Lihat status toko"))
    .addSubcommand((s) => s.setName("info").setDescription("Info toko, produk, dan payment"))
    .addSubcommand((s) =>
      s
        .setName("restock")
        .setDescription("Pengumuman restock produk")
        .addStringOption((o) => o.setName("item").setDescription("Nama produk").setRequired(true))
        .addIntegerOption((o) => o.setName("jumlah").setDescription("Jumlah restock").setRequired(true))
        .addStringOption((o) => o.setName("pesan").setDescription("Pesan tambahan"))
    )
    .addSubcommand((s) =>
      s
        .setName("promo")
        .setDescription("Kirim pengumuman promo")
        .addStringOption((o) => o.setName("pesan").setDescription("Isi promo").setRequired(true))
        .addStringOption((o) => o.setName("judul").setDescription("Judul promo"))
        .addStringOption((o) =>
          o.setName("mention").setDescription("Mention").addChoices(...mentionChoices)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("set-channel")
        .setDescription("Channel pengumuman store")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Text channel").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("set-nama")
        .setDescription("Ubah nama toko")
        .addStringOption((o) => o.setName("nama").setDescription("Nama toko").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("set-jam")
        .setDescription("Atur jam operasional")
        .addStringOption((o) => o.setName("buka").setDescription("Contoh 09:00").setRequired(true))
        .addStringOption((o) => o.setName("tutup").setDescription("Contoh 21:00").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("set-staff")
        .setDescription("Role staff toko (akses ticket)")
        .addRoleOption((o) => o.setName("role").setDescription("Role staff").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("set-kategori")
        .setDescription("Kategori channel ticket")
        .addChannelOption((o) =>
          o
            .setName("kategori")
            .setDescription("Category")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("set-owner")
        .setDescription("Set owner toko (ditampilkan di embed)")
        .addUserOption((o) => o.setName("user").setDescription("Owner").setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName("produk")
    .setDescription("📦 Kelola katalog produk toko")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Tambah produk")
        .addStringOption((o) => o.setName("nama").setDescription("Nama produk").setRequired(true))
        .addIntegerOption((o) => o.setName("harga").setDescription("Harga (Rp)").setRequired(true).setMinValue(0))
        .addIntegerOption((o) => o.setName("stok").setDescription("Stok (-1 = tak terbatas)").setMinValue(-1))
        .addStringOption((o) => o.setName("deskripsi").setDescription("Deskripsi"))
    )
    .addSubcommand((s) =>
      s
        .setName("hapus")
        .setDescription("Hapus produk")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama / ID produk").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("edit")
        .setDescription("Edit produk")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama / ID produk").setRequired(true).setAutocomplete(true)
        )
        .addStringOption((o) => o.setName("nama_baru").setDescription("Ganti nama"))
        .addIntegerOption((o) => o.setName("harga").setDescription("Harga baru").setMinValue(0))
        .addIntegerOption((o) => o.setName("stok").setDescription("Stok baru").setMinValue(-1))
        .addStringOption((o) => o.setName("deskripsi").setDescription("Deskripsi baru"))
    )
    .addSubcommand((s) => s.setName("list").setDescription("Lihat semua produk")),

  new SlashCommandBuilder()
    .setName("payment")
    .setDescription("💳 Metode pembayaran toko")
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Tambah metode")
        .addStringOption((o) => o.setName("metode").setDescription("Contoh: DANA, QRIS, Gopay").setRequired(true))
        .addStringOption((o) => o.setName("nomor").setDescription("Nomor / kode").setRequired(true))
        .addStringOption((o) => o.setName("atas_nama").setDescription("Nama pemilik"))
    )
    .addSubcommand((s) =>
      s
        .setName("hapus")
        .setDescription("Hapus metode")
        .addStringOption((o) => o.setName("metode").setDescription("Nama metode").setRequired(true))
    )
    .addSubcommand((s) => s.setName("list").setDescription("Lihat semua payment")),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("🛒 Pesan produk (membuat ticket pesanan)")
    .addStringOption((o) =>
      o.setName("produk").setDescription("Produk").setRequired(true).setAutocomplete(true)
    )
    .addIntegerOption((o) =>
      o.setName("jumlah").setDescription("Jumlah").setMinValue(1).setMaxValue(99)
    ),

  // ===== TICKET =====
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("🎫 Sistem ticket channel")
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Pasang panel buat ticket di channel ini")
        .addChannelOption((o) =>
          o
            .setName("kategori")
            .setDescription("Category untuk channel ticket")
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addStringOption((o) => o.setName("judul").setDescription("Judul panel"))
        .addStringOption((o) => o.setName("deskripsi").setDescription("Deskripsi panel"))
    )
    .addSubcommand((s) =>
      s
        .setName("close")
        .setDescription("Tutup ticket ini")
        .addStringOption((o) => o.setName("alasan").setDescription("Alasan penutupan"))
    )
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Tambah user ke ticket")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Keluarkan user dari ticket")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
    )
    .addSubcommand((s) => s.setName("claim").setDescription("Staff claim ticket ini"))
    .addSubcommand((s) =>
      s
        .setName("rename")
        .setDescription("Ganti nama channel ticket")
        .addStringOption((o) => o.setName("nama").setDescription("Nama baru").setRequired(true))
    ),

  // ===== TAKE ROLE =====
  new SlashCommandBuilder()
    .setName("takerole")
    .setDescription("🎭 Panel ambil / lepas role lewat tombol")
    .addSubcommand((s) =>
      s
        .setName("panel")
        .setDescription("Buat panel take role")
        .addStringOption((o) => o.setName("judul").setDescription("Judul panel"))
        .addStringOption((o) => o.setName("deskripsi").setDescription("Deskripsi"))
    )
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Tambah tombol role ke panel terakhir")
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
        .addStringOption((o) => o.setName("label").setDescription("Teks tombol"))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji tombol"))
        .addStringOption((o) =>
          o
            .setName("style")
            .setDescription("Warna tombol")
            .addChoices(
              { name: "Biru", value: "primary" },
              { name: "Abu", value: "secondary" },
              { name: "Hijau", value: "success" },
              { name: "Merah", value: "danger" }
            )
        )
        .addStringOption((o) => o.setName("pesan_id").setDescription("ID pesan panel (opsional)"))
    )
    .addSubcommand((s) =>
      s
        .setName("hapus")
        .setDescription("Hapus role dari panel")
        .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
        .addStringOption((o) => o.setName("pesan_id").setDescription("ID pesan panel"))
    )
    .addSubcommand((s) => s.setName("list").setDescription("Daftar panel take role")),

  // ===== WELCOME / GOODBYE =====
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("👋 Atur pesan sambutan member baru")
    .addSubcommand((s) =>
      s
        .setName("channel")
        .setDescription("Channel welcome")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Text channel").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("pesan")
        .setDescription("Template pesan. {user} {user.mention} {server} {membercount}")
        .addStringOption((o) => o.setName("teks").setDescription("Isi pesan").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("banner")
        .setDescription("Atur banner welcome")
        .addStringOption((o) =>
          o
            .setName("preset")
            .setDescription("Preset banner")
            .addChoices(
              { name: "Aurora", value: "aurora" },
              { name: "Dusk", value: "dusk" },
              { name: "Royal", value: "royal" },
              { name: "Matikan banner", value: "none" }
            )
        )
        .addStringOption((o) => o.setName("url").setDescription("URL gambar kustom"))
    )
    .addSubcommand((s) =>
      s
        .setName("warna")
        .setDescription("Warna embed (hex)")
        .addStringOption((o) => o.setName("hex").setDescription("Contoh a78bfa").setRequired(true))
    )
    .addSubcommand((s) => s.setName("on").setDescription("Aktifkan welcome"))
    .addSubcommand((s) => s.setName("off").setDescription("Nonaktifkan welcome"))
    .addSubcommand((s) => s.setName("test").setDescription("Kirim contoh welcome")),

  new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("👋 Atur pesan perpisahan member keluar")
    .addSubcommand((s) =>
      s
        .setName("channel")
        .setDescription("Channel goodbye")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Text channel").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("pesan")
        .setDescription("Template pesan. {user.tag} {server} {membercount}")
        .addStringOption((o) => o.setName("teks").setDescription("Isi pesan").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("warna")
        .setDescription("Warna embed (hex)")
        .addStringOption((o) => o.setName("hex").setDescription("Contoh ff8c42").setRequired(true))
    )
    .addSubcommand((s) => s.setName("on").setDescription("Aktifkan goodbye"))
    .addSubcommand((s) => s.setName("off").setDescription("Nonaktifkan goodbye"))
    .addSubcommand((s) => s.setName("test").setDescription("Kirim contoh goodbye")),

  // ===== GAMES =====
  new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("❌⭕ Tantang member main Tic Tac Toe")
    .addUserOption((o) => o.setName("lawan").setDescription("Lawan").setRequired(true)),
  new SlashCommandBuilder()
    .setName("suit")
    .setDescription("✊ Suit batu / gunting / kertas")
    .addStringOption((o) =>
      o
        .setName("pilihan")
        .setDescription("Pilihanmu")
        .setRequired(true)
        .addChoices(
          { name: "Batu", value: "batu" },
          { name: "Gunting", value: "gunting" },
          { name: "Kertas", value: "kertas" }
        )
    ),
  new SlashCommandBuilder()
    .setName("slot")
    .setDescription("🎰 Main slot (pakai koin)")
    .addIntegerOption((o) =>
      o.setName("taruhan").setDescription("Jumlah koin (default 50)").setMinValue(10).setMaxValue(5000)
    ),
  new SlashCommandBuilder()
    .setName("dadu")
    .setDescription("🎲 Lempar dadu")
    .addIntegerOption((o) =>
      o.setName("sisi").setDescription("Jumlah sisi (default 6)").setMinValue(2).setMaxValue(100)
    ),
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("🪙 Lempar koin")
    .addStringOption((o) =>
      o
        .setName("sisi")
        .setDescription("Tebakan")
        .addChoices({ name: "Angka", value: "angka" }, { name: "Gambar", value: "gambar" })
    )
    .addIntegerOption((o) =>
      o.setName("taruhan").setDescription("Opsional, taruhan koin").setMinValue(10).setMaxValue(5000)
    ),
  new SlashCommandBuilder().setName("tebakangka").setDescription("🔢 Tebak angka 1–100"),
  new SlashCommandBuilder().setName("tebakkata").setDescription("🔤 Susun huruf jadi kata"),
  new SlashCommandBuilder().setName("tebakbendera").setDescription("🚩 Tebak negara dari bendera"),
  new SlashCommandBuilder().setName("caklontong").setDescription("😂 Tebak-tebakan Cak Lontong"),
  new SlashCommandBuilder().setName("math").setDescription("🧮 Kuis matematika cepat"),
  new SlashCommandBuilder().setName("siapakahaku").setDescription("🕵️ Tebak siapa aku dari petunjuk"),
  new SlashCommandBuilder().setName("hangman").setDescription("💀 Tebak kata sebelum digantung"),

  // ===== ECONOMY =====
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Cek saldo koin")
    .addUserOption((o) => o.setName("user").setDescription("User lain")),
  new SlashCommandBuilder().setName("daily").setDescription("📅 Klaim koin harian"),
  new SlashCommandBuilder().setName("work").setDescription("💼 Kerja untuk dapat koin"),
  new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("💸 Transfer koin ke member lain")
    .addUserOption((o) => o.setName("user").setDescription("Penerima").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("jumlah").setDescription("Jumlah koin").setRequired(true).setMinValue(10)
    ),
  new SlashCommandBuilder().setName("leaderboard").setDescription("🏆 Papan peringkat koin"),
  new SlashCommandBuilder()
    .setName("givekoin")
    .setDescription("🛠️ (Admin) tambah / kurangi koin")
    .addUserOption((o) => o.setName("user").setDescription("Target").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("jumlah").setDescription("Positif = tambah, negatif = kurang").setRequired(true)
    ),

  // ===== UTILITY =====
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("🖼️ Lihat avatar")
    .addUserOption((o) => o.setName("user").setDescription("User")),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("👤 Info member")
    .addUserOption((o) => o.setName("user").setDescription("User")),
  new SlashCommandBuilder().setName("serverinfo").setDescription("🏠 Info server"),
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("🏅 Lihat level & XP")
    .addUserOption((o) => o.setName("user").setDescription("Member")),
  new SlashCommandBuilder().setName("levels").setDescription("🏆 Leaderboard XP server"),
  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("💡 Kirim saran ke komunitas")
    .addStringOption((o) => o.setName("pesan").setDescription("Isi saran").setRequired(true)),
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Giveaway komunitas")
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("Mulai giveaway")
        .addStringOption((o) => o.setName("durasi").setDescription("Contoh 10m / 2h / 1d").setRequired(true))
        .addStringOption((o) => o.setName("hadiah").setDescription("Hadiah").setRequired(true))
        .addIntegerOption((o) => o.setName("pemenang").setDescription("Jumlah pemenang").setMinValue(1).setMaxValue(20))
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("Akhiri giveaway")
        .addStringOption((o) => o.setName("pesan_id").setDescription("ID pesan giveaway").setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName("afk")
    .setDescription("💤 Tandai sedang AFK")
    .addStringOption((o) => o.setName("alasan").setDescription("Alasan")),
  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("📢 Kirim pengumuman embed")
    .addStringOption((o) => o.setName("pesan").setDescription("Isi").setRequired(true))
    .addStringOption((o) => o.setName("judul").setDescription("Judul"))
    .addChannelOption((o) =>
      o.setName("channel").setDescription("Channel tujuan").addChannelTypes(ChannelType.GuildText)
    ),
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("✅ Pasang panel verifikasi")
    .addRoleOption((o) => o.setName("role").setDescription("Role setelah verifikasi")),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("📊 Buat polling tombol")
    .addStringOption((o) => o.setName("pertanyaan").setDescription("Pertanyaan").setRequired(true))
    .addStringOption((o) => o.setName("opsi1").setDescription("Opsi 1").setRequired(true))
    .addStringOption((o) => o.setName("opsi2").setDescription("Opsi 2").setRequired(true))
    .addStringOption((o) => o.setName("opsi3").setDescription("Opsi 3"))
    .addStringOption((o) => o.setName("opsi4").setDescription("Opsi 4"))
    .addStringOption((o) => o.setName("opsi5").setDescription("Opsi 5")),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
      console.error("❌ BOT_TOKEN dan CLIENT_ID wajib diisi di .env");
      process.exit(1);
    }
    console.log(`⏳ Mendaftarkan ${commands.length} slash commands...`);
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
    process.exit(1);
  }
})();
