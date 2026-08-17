// ==========================================
// Mini games Discord
// ==========================================
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { TEBAK_KATA, HANGMAN_WORDS, CAKLONTONG, BENDERA, SIAPA_AKU } = require("../data/questions");
const { COLORS, coins, embed, respond, pick, shuffle, takeCooldown } = require("../lib/util");
const economy = require("./economy");

/** @type {Map<string, any>} */
const active = new Map();
/** @type {Map<string, any>} */
const tttPending = new Map();

function channelKey(interaction) {
  return `${interaction.guildId}:${interaction.channelId}`;
}

function quizLock(interaction, type) {
  const key = channelKey(interaction);
  const cur = active.get(key);
  if (cur && Date.now() < cur.expires) {
    return `⏳ Masih ada game **${cur.type}** di channel ini. Selesaikan atau tunggu habis waktu.`;
  }
  return null;
}

function startQuiz(interaction, state) {
  const key = channelKey(interaction);
  state.channelKey = key;
  state.host = interaction.user.id;
  active.set(key, state);
  return key;
}

function endQuiz(key) {
  active.delete(key);
}

function reward(interaction, win, amount) {
  if (!interaction.guildId) return 0;
  return economy.recordGame(interaction.guildId, interaction.user.id, win, amount);
}

function guessBtn(id = "game_guess") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(id).setLabel("Tebak").setEmoji("✍️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("game_giveup").setLabel("Menyerah").setStyle(ButtonStyle.Danger)
  );
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function answersMatch(input, answers) {
  const n = normalize(input);
  return answers.some((a) => normalize(a) === n);
}

async function handleCommand(interaction) {
  const cmd = interaction.commandName;

  if (cmd === "tictactoe") return startTtt(interaction);
  if (cmd === "suit") return playSuit(interaction);
  if (cmd === "slot") return playSlot(interaction);
  if (cmd === "dadu") return playDadu(interaction);
  if (cmd === "coinflip") return playCoinflip(interaction);
  if (cmd === "tebakangka") return startTebakAngka(interaction);
  if (cmd === "tebakkata") return startTebakKata(interaction);
  if (cmd === "tebakbendera") return startTebakBendera(interaction);
  if (cmd === "caklontong") return startCaklontong(interaction);
  if (cmd === "math") return startMath(interaction);
  if (cmd === "siapakahaku") return startSiapa(interaction);
  if (cmd === "hangman") return startHangman(interaction);
}

// ---------- TIC TAC TOE ----------
async function startTtt(interaction) {
  const lawan = interaction.options.getUser("lawan");
  if (lawan.bot) return respond(interaction, { content: "❌ Tidak bisa lawan bot. Tantang member lain.", ephemeral: true });
  if (lawan.id === interaction.user.id) {
    return respond(interaction, { content: "❌ Tidak bisa lawan diri sendiri.", ephemeral: true });
  }
  const id = `${interaction.user.id}:${lawan.id}:${Date.now().toString(36)}`;
  tttPending.set(id, {
    x: interaction.user.id,
    o: lawan.id,
    board: Array(9).fill(null),
    turn: interaction.user.id,
    expires: Date.now() + 120000,
  });
  return respond(interaction, {
    content: `${lawan}, kamu ditantang **Tic Tac Toe** oleh ${interaction.user}!`,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ttt_accept:${id}`).setLabel("Terima").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ttt_decline:${id}`).setLabel("Tolak").setStyle(ButtonStyle.Danger)
      ),
    ],
  });
}

function tttRows(gameId, board, disabled = false) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const v = board[i];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_move:${gameId}:${i}`)
          .setLabel(v || "·")
          .setStyle(v === "X" ? ButtonStyle.Danger : v === "O" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled || !!v)
      );
    }
    rows.push(row);
  }
  return rows;
}

function winnerOf(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

async function handleTttButton(interaction) {
  const [kind, id, pos] = interaction.customId.split(":");
  if (kind === "ttt_accept") {
    const g = tttPending.get(id);
    if (!g) return interaction.reply({ content: "Tantangan sudah kadaluarsa.", ephemeral: true });
    if (interaction.user.id !== g.o) {
      return interaction.reply({ content: "Ini bukan tantangan untukmu.", ephemeral: true });
    }
    tttPending.delete(id);
    active.set(`ttt:${id}`, g);
    return interaction.update({
      content: `❌ ${"<@" + g.x + ">"} vs ⭕ ${"<@" + g.o + ">"}\nGiliran: <@${g.turn}>`,
      components: tttRows(id, g.board),
    });
  }
  if (kind === "ttt_decline") {
    const g = tttPending.get(id);
    if (!g) return interaction.reply({ content: "Sudah tidak valid.", ephemeral: true });
    if (interaction.user.id !== g.o && interaction.user.id !== g.x) {
      return interaction.reply({ content: "Bukan tantanganmu.", ephemeral: true });
    }
    tttPending.delete(id);
    return interaction.update({ content: "❌ Tantangan ditolak.", components: [] });
  }
  if (kind === "ttt_move") {
    const g = active.get(`ttt:${id}`);
    if (!g) return interaction.reply({ content: "Game sudah selesai.", ephemeral: true });
    if (interaction.user.id !== g.turn) {
      return interaction.reply({ content: "Bukan giliranmu!", ephemeral: true });
    }
    const i = parseInt(pos, 10);
    if (g.board[i]) return interaction.reply({ content: "Kotak sudah terisi.", ephemeral: true });
    const mark = interaction.user.id === g.x ? "X" : "O";
    g.board[i] = mark;
    const w = winnerOf(g.board);
    if (w === "X" || w === "O") {
      const winnerId = w === "X" ? g.x : g.o;
      const loserId = w === "X" ? g.o : g.x;
      reward({ guildId: interaction.guildId, user: { id: winnerId } }, true, 80);
      economy.recordGame(interaction.guildId, loserId, false, 0);
      active.delete(`ttt:${id}`);
      return interaction.update({
        content: `🏆 <@${winnerId}> menang! (+80 🪙)`,
        components: tttRows(id, g.board, true),
      });
    }
    if (w === "draw") {
      active.delete(`ttt:${id}`);
      return interaction.update({
        content: "🤝 Seri!",
        components: tttRows(id, g.board, true),
      });
    }
    g.turn = g.turn === g.x ? g.o : g.x;
    return interaction.update({
      content: `❌ <@${g.x}> vs ⭕ <@${g.o}>\nGiliran: <@${g.turn}>`,
      components: tttRows(id, g.board),
    });
  }
}

// ---------- SUIT / SLOT / DADU / COIN ----------
async function playSuit(interaction) {
  const pilihan = interaction.options.getString("pilihan");
  const bot = pick(["batu", "gunting", "kertas"]);
  const emoji = { batu: "🪨", gunting: "✂️", kertas: "📄" };
  const win =
    (pilihan === "batu" && bot === "gunting") ||
    (pilihan === "gunting" && bot === "kertas") ||
    (pilihan === "kertas" && bot === "batu");
  const draw = pilihan === bot;
  let result;
  let delta = 0;
  if (draw) result = "🤝 Seri!";
  else if (win) {
    delta = 40;
    reward(interaction, true, delta);
    result = `🏆 Kamu menang! +${coins(delta)}`;
  } else {
    reward(interaction, false, 0);
    result = "😢 Kamu kalah.";
  }
  return respond(interaction, {
    embeds: [
      embed({
        color: win ? COLORS.green : draw ? COLORS.gold : COLORS.red,
        title: "✊ Suit",
        description: `Kamu: ${emoji[pilihan]} **${pilihan}**\nBot: ${emoji[bot]} **${bot}**\n\n${result}`,
      }),
    ],
  });
}

async function playSlot(interaction) {
  const wait = takeCooldown(`slot:${interaction.user.id}`, 4000);
  if (wait) return respond(interaction, { content: `⏳ Tunggu ${wait}s.`, ephemeral: true });
  const taruhan = interaction.options.getInteger("taruhan") || 50;
  const bal = economy.getBal(interaction.guildId, interaction.user.id);
  if (bal < taruhan) {
    return respond(interaction, {
      content: `❌ Saldo kurang. Butuh ${coins(taruhan)}, kamu punya ${coins(bal)}. Klaim \`/daily\` dulu.`,
      ephemeral: true,
    });
  }
  const reels = ["🍒", "🍋", "🍇", "🍉", "⭐", "💎"];
  const spin = [pick(reels), pick(reels), pick(reels)];
  let delta = -taruhan;
  let text = "Tidak ada kombinasi.";
  if (spin[0] === spin[1] && spin[1] === spin[2]) {
    const multi = spin[0] === "💎" ? 12 : spin[0] === "⭐" ? 8 : 5;
    delta = taruhan * multi;
    text = `JACKPOT ×${multi}!`;
  } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
    delta = Math.floor(taruhan * 1.5);
    text = "Dua pasangan! ×1.5";
  }
  const newBal = economy.recordGame(interaction.guildId, interaction.user.id, delta > 0, delta);
  return respond(interaction, {
    embeds: [
      embed({
        color: delta > 0 ? COLORS.green : COLORS.red,
        title: "🎰 Slot",
        description: `**[ ${spin.join(" | ")} ]**\n\n${text}\n${delta >= 0 ? "Menang" : "Kalah"}: **${coins(Math.abs(delta))}**\nSaldo: **${coins(newBal)}**`,
      }),
    ],
  });
}

async function playDadu(interaction) {
  const sisi = interaction.options.getInteger("sisi") || 6;
  const n = 1 + Math.floor(Math.random() * sisi);
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.blurple,
        title: "🎲 Dadu",
        description: `Lempar d${sisi}... hasilnya **${n}**!`,
      }),
    ],
  });
}

async function playCoinflip(interaction) {
  const sisi = interaction.options.getString("sisi") || "angka";
  const taruhan = interaction.options.getInteger("taruhan") || 0;
  const hasil = pick(["angka", "gambar"]);
  const win = sisi === hasil;
  let extra = "";
  if (taruhan > 0) {
    const bal = economy.getBal(interaction.guildId, interaction.user.id);
    if (bal < taruhan) {
      return respond(interaction, { content: `❌ Saldo kurang (${coins(bal)}).`, ephemeral: true });
    }
    const delta = win ? taruhan : -taruhan;
    const newBal = economy.recordGame(interaction.guildId, interaction.user.id, win, delta);
    extra = `\n${win ? "Menang" : "Kalah"} ${coins(taruhan)} · saldo **${coins(newBal)}**`;
  }
  return respond(interaction, {
    embeds: [
      embed({
        color: win ? COLORS.green : COLORS.red,
        title: "🪙 Coinflip",
        description: `Kamu pilih **${sisi}**.\nHasil: **${hasil === "angka" ? "🔢 Angka" : "🖼️ Gambar"}**.\n${win ? "Tebakan benar!" : "Salah."}${extra}`,
      }),
    ],
  });
}

// ---------- QUIZ GAMES ----------
async function startTebakAngka(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const secret = 1 + Math.floor(Math.random() * 100);
  startQuiz(interaction, {
    type: "tebakangka",
    secret,
    tries: 0,
    max: 7,
    expires: Date.now() + 90000,
    check: (ans) => {
      const n = parseInt(ans, 10);
      if (Number.isNaN(n)) return { ok: false, hint: "Masukkan angka 1–100." };
      if (n === secret) return { ok: true };
      return { ok: false, hint: n < secret ? "Terlalu kecil 📉" : "Terlalu besar 📈" };
    },
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: "🔢 Tebak Angka",
        description: "Aku memikirkan angka **1–100**.\nKamu punya **7** kesempatan. Klik **Tebak** atau ketik angkanya.",
      }),
    ],
    components: [guessBtn()],
  });
}

async function startTebakKata(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const word = pick(TEBAK_KATA);
  let scrambled = shuffle(word.split("")).join("");
  if (scrambled === word) scrambled = shuffle(word.split("")).join("");
  startQuiz(interaction, {
    type: "tebakkata",
    answers: [word],
    expires: Date.now() + 60000,
    check: (ans) => ({ ok: normalize(ans) === normalize(word) }),
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.teal,
        title: "🔤 Tebak Kata",
        description: `Susun huruf ini menjadi kata:\n# \`${scrambled}\`\n\nWaktu 60 detik.`,
      }),
    ],
    components: [guessBtn()],
  });
}

async function startTebakBendera(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const item = pick(BENDERA);
  startQuiz(interaction, {
    type: "tebakbendera",
    answers: item.answers,
    expires: Date.now() + 45000,
    check: (ans) => ({ ok: answersMatch(ans, item.answers) }),
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.blurple,
        title: "🚩 Tebak Bendera",
        description: `Bendera negara apakah ini?\n\n# ${item.flag}\n\n45 detik.`,
      }),
    ],
    components: [guessBtn()],
  });
}

async function startCaklontong(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const item = pick(CAKLONTONG);
  startQuiz(interaction, {
    type: "caklontong",
    answers: item.a,
    hint: item.hint,
    expires: Date.now() + 45000,
    check: (ans) => ({ ok: answersMatch(ans, item.a) }),
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.orange,
        title: "😂 Cak Lontong",
        description: `**${item.q}**\n\n_Hint: ${item.hint}_\n45 detik.`,
      }),
    ],
    components: [guessBtn()],
  });
}

async function startMath(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const ops = [
    () => {
      const a = 10 + Math.floor(Math.random() * 40);
      const b = 5 + Math.floor(Math.random() * 30);
      return { q: `${a} + ${b}`, a: a + b };
    },
    () => {
      const a = 20 + Math.floor(Math.random() * 40);
      const b = 5 + Math.floor(Math.random() * 15);
      return { q: `${a} - ${b}`, a: a - b };
    },
    () => {
      const a = 3 + Math.floor(Math.random() * 12);
      const b = 2 + Math.floor(Math.random() * 9);
      return { q: `${a} × ${b}`, a: a * b };
    },
  ];
  const item = pick(ops)();
  startQuiz(interaction, {
    type: "math",
    answers: [String(item.a)],
    expires: Date.now() + 25000,
    check: (ans) => ({ ok: parseInt(ans, 10) === item.a }),
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.pink,
        title: "🧮 Math Quiz",
        description: `Berapa hasil dari\n# ${item.q}\n\n25 detik.`,
      }),
    ],
    components: [guessBtn()],
  });
}

async function startSiapa(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const item = pick(SIAPA_AKU);
  startQuiz(interaction, {
    type: "siapakahaku",
    answers: item.answers,
    expires: Date.now() + 60000,
    check: (ans) => ({ ok: answersMatch(ans, item.answers) }),
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.gold,
        title: "🕵️ Siapakah Aku?",
        description: item.clues.map((c, i) => `**${i + 1}.** ${c}`).join("\n") + "\n\n60 detik.",
      }),
    ],
    components: [guessBtn()],
  });
}

function hangmanArt(lives) {
  const stages = [
    "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=======```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=======```",
  ];
  return stages[Math.min(6, 6 - lives)];
}

function hangmanView(word, guessed) {
  return word
    .split("")
    .map((ch) => (guessed.includes(ch) ? ch : "_"))
    .join(" ");
}

async function startHangman(interaction) {
  const busy = quizLock(interaction);
  if (busy) return respond(interaction, { content: busy, ephemeral: true });
  const item = pick(HANGMAN_WORDS);
  const guessed = [];
  startQuiz(interaction, {
    type: "hangman",
    word: item.word,
    answers: [item.word],
    guessed,
    lives: 6,
    expires: Date.now() + 120000,
    check: (ans) => {
      const n = normalize(ans).replace(/\s/g, "").toUpperCase();
      if (n.length > 1) return { ok: n === item.word, hangmanLetter: null, whole: true };
      const letter = n[0];
      return { ok: item.word.includes(letter), hangmanLetter: letter, whole: false };
    },
  });
  return respond(interaction, {
    embeds: [
      embed({
        color: COLORS.orange,
        title: "💀 Hangman",
        description: `${hangmanArt(6)}\n\`${hangmanView(item.word, guessed)}\`\nHint: *${item.hint}*\nNyawa: **6**`,
      }),
    ],
    components: [guessBtn("game_guess")],
  });
}

async function handleGuessAttempt(interaction, answer, viaModal) {
  const key = channelKey(interaction);
  const game = active.get(key);
  if (!game || Date.now() > game.expires) {
    endQuiz(key);
    const msg = "Game sudah berakhir atau tidak ada game aktif di channel ini.";
    return viaModal
      ? interaction.reply({ content: msg, ephemeral: true })
      : null;
  }

  if (game.type === "tebakangka") {
    game.tries = (game.tries || 0) + 1;
    const res = game.check(answer);
    if (res.ok) {
      endQuiz(key);
      const gain = 60;
      reward(interaction, true, gain);
      const payload = {
        embeds: [
          embed({
            color: COLORS.green,
            title: "🎉 Benar!",
            description: `${interaction.user} menebak **${game.secret}** dalam ${game.tries} percobaan.\n+${coins(gain)}`,
          }),
        ],
        components: [],
      };
      return finishGuess(interaction, viaModal, payload);
    }
    if (game.tries >= game.max) {
      endQuiz(key);
      reward(interaction, false, 0);
      return finishGuess(interaction, viaModal, {
        embeds: [
          embed({
            color: COLORS.red,
            title: "Kesempatan habis",
            description: `Angkanya **${game.secret}**.`,
          }),
        ],
        components: [],
      });
    }
    return finishGuess(interaction, viaModal, {
      content: `${res.hint} · sisa **${game.max - game.tries}** percobaan.`,
      ephemeral: true,
    });
  }

  if (game.type === "hangman") {
    const res = game.check(answer);
    if (res.whole && res.ok) {
      endQuiz(key);
      reward(interaction, true, 90);
      return finishGuess(interaction, viaModal, {
        embeds: [
          embed({
            color: COLORS.green,
            title: "🎉 Kata tertebak!",
            description: `${interaction.user} benar: **${game.word}**\n+${coins(90)}`,
          }),
        ],
        components: [],
      });
    }
    if (res.whole && !res.ok) {
      game.lives -= 1;
    } else if (res.hangmanLetter) {
      if (game.guessed.includes(res.hangmanLetter)) {
        return finishGuess(interaction, viaModal, {
          content: `Huruf **${res.hangmanLetter}** sudah ditebak.`,
          ephemeral: true,
        });
      }
      game.guessed.push(res.hangmanLetter);
      if (!res.ok) game.lives -= 1;
    }
    const view = hangmanView(game.word, game.guessed);
    if (!view.includes("_")) {
      endQuiz(key);
      reward(interaction, true, 90);
      return finishGuess(interaction, viaModal, {
        embeds: [
          embed({
            color: COLORS.green,
            title: "🎉 Selamat!",
            description: `Kata: **${game.word}** · ${interaction.user} +${coins(90)}`,
          }),
        ],
        components: [],
      });
    }
    if (game.lives <= 0) {
      endQuiz(key);
      reward(interaction, false, 0);
      return finishGuess(interaction, viaModal, {
        embeds: [
          embed({
            color: COLORS.red,
            title: "💀 Hangman kalah",
            description: `${hangmanArt(0)}\nKatanya **${game.word}**.`,
          }),
        ],
        components: [],
      });
    }
    return finishGuess(interaction, viaModal, {
      embeds: [
        embed({
          color: COLORS.orange,
          title: "💀 Hangman",
          description: `${hangmanArt(game.lives)}\n\`${view}\`\nTebakan: ${game.guessed.join(", ") || "—"}\nNyawa: **${game.lives}**`,
        }),
      ],
      components: [guessBtn()],
    });
  }

  const res = game.check(answer);
  if (res.ok) {
    const prize = { tebakkata: 70, tebakbendera: 50, caklontong: 55, math: 40, siapakahaku: 80 }[game.type] || 50;
    endQuiz(key);
    reward(interaction, true, prize);
    return finishGuess(interaction, viaModal, {
      embeds: [
        embed({
          color: COLORS.green,
          title: "🎉 Jawaban benar!",
          description: `${interaction.user} menjawab **${answer}**\n+${coins(prize)}`,
        }),
      ],
      components: [],
    });
  }
  return finishGuess(interaction, viaModal, {
    content: `❌ **${answer}** belum tepat. Coba lagi!`,
    ephemeral: true,
  });
}

async function finishGuess(interaction, viaModal, payload) {
  if (viaModal) {
    if (payload.ephemeral) return interaction.reply(payload);
    if (interaction.message && payload.embeds) {
      await interaction.message
        .edit({
          embeds: payload.embeds,
          components: payload.components || [],
          content: payload.content || null,
        })
        .catch(() => {});
      return interaction.reply({ content: payload.embeds[0].data?.title || "✅", ephemeral: true }).catch(() => {});
    }
    return interaction.reply(payload);
  }
  if (interaction.replied || interaction.deferred) return;
  const chatPayload = { ...payload };
  delete chatPayload.ephemeral;
  return interaction.reply(chatPayload);
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith("ttt_")) return handleTttButton(interaction);

  if (interaction.customId === "game_giveup") {
    const key = channelKey(interaction);
    const game = active.get(key);
    if (!game) return interaction.reply({ content: "Tidak ada game aktif.", ephemeral: true });
    if (interaction.user.id !== game.host && !interaction.memberPermissions?.has?.("ManageMessages")) {
      return interaction.reply({ content: "Hanya pembuat game yang bisa menyerah.", ephemeral: true });
    }
    const ans = game.secret || game.word || (game.answers && game.answers[0]) || "?";
    endQuiz(key);
    return interaction.update({
      embeds: [
        embed({
          color: COLORS.red,
          title: "🏳️ Menyerah",
          description: `Jawaban: **${ans}**`,
        }),
      ],
      components: [],
    });
  }

  if (interaction.customId === "game_guess") {
    const key = channelKey(interaction);
    const game = active.get(key);
    if (!game) return interaction.reply({ content: "Tidak ada game aktif.", ephemeral: true });
    const modal = new ModalBuilder().setCustomId("game_modal").setTitle("Kirim jawaban");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("answer")
          .setLabel(game.type === "hangman" ? "Huruf atau kata" : "Jawabanmu")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(64)
      )
    );
    return interaction.showModal(modal);
  }
}

async function handleModal(interaction) {
  if (interaction.customId !== "game_modal") return;
  const answer = interaction.fields.getTextInputValue("answer");
  return handleGuessAttempt(interaction, answer, true);
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  const key = `${message.guild.id}:${message.channel.id}`;
  const game = active.get(key);
  if (!game || Date.now() > game.expires) {
    if (game) endQuiz(key);
    return;
  }
  const fake = {
    guildId: message.guild.id,
    channelId: message.channel.id,
    user: message.author,
    replied: false,
    deferred: false,
    message: null,
    reply: (p) => message.reply(p),
  };
  // For chat guesses, reply in channel (not ephemeral for correct)
  const result = await handleGuessAttempt(fake, message.content, false);
  return result;
}

// expire sweeper
setInterval(() => {
  const now = Date.now();
  for (const [k, g] of active) {
    if (g.expires && now > g.expires) active.delete(k);
  }
  for (const [k, g] of tttPending) {
    if (g.expires && now > g.expires) tttPending.delete(k);
  }
}, 15000).unref();

module.exports = {
  handleCommand,
  handleButton,
  handleModal,
  handleMessage,
};
