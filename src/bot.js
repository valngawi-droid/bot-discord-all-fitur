// ==========================================
// BOT DISCORD — Panel + Store + Ticket + Game
// ==========================================
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require("discord.js");

const ptero = require("./pterodactyl");
const store = require("./features/store");
const tickets = require("./features/tickets");
const takerole = require("./features/takerole");
const welcome = require("./features/welcome");
const games = require("./features/games");
const economy = require("./features/economy");
const utility = require("./features/utility");
const panel = require("./features/panel");

const BASE_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];
const PRIVILEGED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.MessageContent,
];

function createClient(intents) {
  return new Client({
    intents,
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.Message,
      Partials.User,
    ],
  });
}

function attachEvents(client) {
  client.once("ready", () => {
    console.log(`✅ Bot login sebagai ${client.user.tag}`);
    if (ptero.DEMO_MODE) {
      console.log("⚠️  MODE DEMO — panel belum disambungkan, data hanya simulasi");
    }
    const spin = [
      { name: "Store • Ticket • Games", type: ActivityType.Watching },
      { name: "/help | All Fitur", type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} server`, type: ActivityType.Watching },
    ];
    let i = 0;
    const apply = () => {
      const a = spin[i % spin.length];
      client.user.setActivity(a.name, { type: a.type });
      i += 1;
    };
    apply();
    setInterval(apply, 25000);
  });

  client.on("guildMemberAdd", (member) => {
    welcome.handleJoin(member).catch((err) => console.error("welcome:", err.message));
  });

  client.on("guildMemberRemove", (member) => {
    welcome.handleLeave(member).catch((err) => console.error("goodbye:", err.message));
  });

  client.on("messageCreate", (message) => {
    games.handleMessage(message).catch(() => {});
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        const focusedCmd = interaction.commandName;
        if (focusedCmd === "buy" || focusedCmd === "produk") {
          return store.autocompleteProduk(interaction);
        }
        return;
      }

      if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith("ticket_")) return tickets.handleButton(interaction);
        if (id.startsWith("store_")) return store.handleButton(interaction, tickets);
        if (id.startsWith("takerole:")) return takerole.handleButton(interaction);
        if (id.startsWith("ttt_") || id.startsWith("game_")) return games.handleButton(interaction);
        if (id.startsWith("poll:")) return utility.handlePollButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "help_menu") return utility.handleHelpSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === "game_modal") return games.handleModal(interaction);
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      const cmd = interaction.commandName;

      if (cmd === "ping") return utility.handlePing(interaction, client);
      if (cmd === "help") return utility.handleHelp(interaction);
      if (cmd === "avatar") return utility.handleAvatar(interaction);
      if (cmd === "userinfo") return utility.handleUserInfo(interaction);
      if (cmd === "serverinfo") return utility.handleServerInfo(interaction);
      if (cmd === "poll") return utility.handlePoll(interaction);

      if (cmd === "store") return store.handleCommand(interaction);
      if (cmd === "produk") return store.handleProduk(interaction);
      if (cmd === "payment") return store.handlePayment(interaction);
      if (cmd === "buy") return store.handleBuy(interaction, tickets);

      if (cmd === "ticket") return tickets.handleCommand(interaction);
      if (cmd === "takerole") return takerole.handleCommand(interaction);
      if (cmd === "welcome") return welcome.handleWelcome(interaction);
      if (cmd === "goodbye") return welcome.handleGoodbye(interaction);

      if (
        [
          "tictactoe",
          "suit",
          "slot",
          "dadu",
          "coinflip",
          "tebakangka",
          "tebakkata",
          "tebakbendera",
          "caklontong",
          "math",
          "siapakahaku",
          "hangman",
        ].includes(cmd)
      ) {
        return games.handleCommand(interaction);
      }

      if (cmd === "balance") return economy.handleBalance(interaction);
      if (cmd === "daily") return economy.handleDaily(interaction);
      if (cmd === "work") return economy.handleWork(interaction);
      if (cmd === "transfer") return economy.handleTransfer(interaction);
      if (cmd === "leaderboard") return economy.handleLeaderboard(interaction);
      if (cmd === "givekoin") return economy.handleGiveKoin(interaction);

      if (["createpanel", "deletepanel", "deleteuser", "listserver", "listuser"].includes(cmd)) {
        return panel.handle(interaction);
      }
    } catch (err) {
      console.error("❌ Error:", err.response?.data || err.message);
      const msg =
        "❌ Terjadi error: `" +
        (err.response?.data?.errors?.[0]?.detail || err.message) +
        "`";
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: msg, embeds: [], components: [] });
        } else {
          await interaction.reply({ content: msg, ephemeral: true });
        }
      } catch {
        /* ignore */
      }
    }
  });

  client.on("error", (err) => console.error("⚠️  Discord error:", err.message));
  return client;
}

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum diisi di file .env!");
  process.exit(1);
}

process.on("unhandledRejection", (err) => {
  console.error("⚠️  Unhandled rejection:", err.message || err);
});

let client = createClient([...BASE_INTENTS, ...PRIVILEGED_INTENTS]);
attachEvents(client);

client.login(process.env.BOT_TOKEN).catch((err) => {
  const text = String(err.message || err);
  if (/intent/i.test(text)) {
    console.warn("⚠️  Privileged intents belum diaktifkan di Developer Portal.");
    console.warn("    Aktifkan SERVER MEMBERS INTENT + MESSAGE CONTENT INTENT");
    console.warn("    agar welcome/goodbye & tebak ketik berjalan penuh.");
    console.warn("    Mencoba login ulang tanpa privileged intents...");
    client.destroy();
    client = createClient(BASE_INTENTS);
    attachEvents(client);
    return client.login(process.env.BOT_TOKEN).catch((err2) => {
      console.error("❌ Bot gagal login:", err2.message);
      console.error("   → Website tetap berjalan normal.");
    });
  }
  console.error("❌ Bot gagal login:", err.message);
  console.error("   → Cek token, atau koneksi internet ke discord.com");
  console.error("   → Website tetap berjalan normal.");
});
