// Banner welcome / goodbye (file lokal + URL kustom)
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");

const DIR = path.join(__dirname, "../web/public/banners");

const PRESETS = {
  aurora: { file: "welcome.jpg", label: "Aurora" },
  dusk: { file: "goodbye.jpg", label: "Dusk" },
  royal: { file: "royal.jpg", label: "Royal" },
};

function presetPath(key) {
  const p = PRESETS[key];
  if (!p) return null;
  const full = path.join(DIR, p.file);
  return fs.existsSync(full) ? full : null;
}

function listPresets() {
  return Object.entries(PRESETS).map(([id, v]) => ({
    id,
    label: v.label,
    url: `/banners/${v.file}`,
  }));
}

async function buildBannerAttachment(part) {
  if (!part || part.showBanner === false) return null;
  if (part.bannerUrl && /^https?:\/\//i.test(part.bannerUrl)) {
    return { url: part.bannerUrl, file: null };
  }
  const file = presetPath(part.bannerPreset || "aurora");
  if (!file) return null;
  return {
    url: "attachment://x-banner.jpg",
    file: new AttachmentBuilder(file, { name: "x-banner.jpg" }),
  };
}

module.exports = { PRESETS, listPresets, presetPath, buildBannerAttachment };
