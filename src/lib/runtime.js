// Client Discord dibagi ke website (tanpa circular require)
let client = null;

function setClient(c) {
  client = c;
}

function getClient() {
  return client;
}

function isReady() {
  return Boolean(client && client.isReady && client.isReady());
}

function listGuilds() {
  if (!isReady()) return [];
  return [...client.guilds.cache.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64 }),
      memberCount: g.memberCount,
    }));
}

function firstGuildId() {
  const list = listGuilds();
  return list[0]?.id || process.env.GUILD_ID || null;
}

function inviteUrl() {
  const id = process.env.CLIENT_ID || client?.user?.id;
  if (!id) return null;
  const perms = "268823632";
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=${perms}&scope=bot%20applications.commands`;
}

async function getGuildSnapshot(guildId) {
  if (!isReady() || !guildId || guildId === "web") return null;
  try {
    const guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return null;
    const channels = [...guild.channels.cache.values()]
      .filter((c) => c)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parent: c.parentId || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const roles = [...guild.roles.cache.values()]
      .filter((r) => r.id !== guild.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }));
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      channels,
      roles,
      botTag: client.user.tag,
      botAvatar: client.user.displayAvatarURL({ size: 128 }),
      nickname: guild.members.me?.nickname || client.user.username,
    };
  } catch {
    return null;
  }
}

async function applyBotName(name, guildId) {
  if (!isReady()) return { ok: false, error: "Bot belum online" };
  const nick = String(name || "").trim().slice(0, 32);
  if (!nick) return { ok: false, error: "Nama kosong" };
  const targets = guildId
    ? [client.guilds.cache.get(guildId)].filter(Boolean)
    : [...client.guilds.cache.values()];
  const results = [];
  for (const guild of targets) {
    try {
      await guild.members.me.setNickname(nick);
      results.push({ guild: guild.name, ok: true });
    } catch (err) {
      results.push({ guild: guild.name, ok: false, error: err.message });
    }
  }
  return { ok: true, results, name: nick };
}

module.exports = {
  setClient,
  getClient,
  isReady,
  listGuilds,
  firstGuildId,
  inviteUrl,
  getGuildSnapshot,
  applyBotName,
};
