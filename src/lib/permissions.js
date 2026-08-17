// ==========================================
// Cek izin owner / admin / staff toko
// ==========================================
const ptero = require("../pterodactyl");

const OWNER_IDS = (process.env.OWNER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isOwner(userId) {
  return OWNER_IDS.includes(userId);
}

function isAdmin(interaction) {
  if (ptero.DEMO_MODE && process.env.DEMO_LOCK_ADMIN !== "1") return true;
  if (isOwner(interaction.user.id)) return true;
  const member = interaction.member;
  if (member && member.roles && member.permissions) {
    if (member.permissions.has?.("Administrator")) return true;
    const roles = member.roles.cache;
    if (roles && ADMIN_ROLE_IDS.some((r) => roles.has(r))) return true;
  }
  return false;
}

function isStaff(interaction, staffRoleId) {
  if (isAdmin(interaction)) return true;
  if (!staffRoleId || !interaction.member?.roles) return false;
  return interaction.member.roles.cache.has(staffRoleId);
}

function deny(interaction, text = "❌ Kamu tidak punya izin memakai perintah ini!") {
  const payload = { content: text, ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload).catch(() => {});
  }
  return interaction.reply(payload).catch(() => {});
}

module.exports = {
  OWNER_IDS,
  ADMIN_ROLE_IDS,
  isOwner,
  isAdmin,
  isStaff,
  deny,
};
