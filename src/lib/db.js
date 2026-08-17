// ==========================================
// Penyimpanan JSON sederhana (persist ke /data)
// ==========================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const cache = new Map();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name, fallback = {}) {
  if (cache.has(name)) return cache.get(name);
  ensureDir();
  const file = filePath(name);
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      const clone = structuredClone(fallback);
      cache.set(name, clone);
      return clone;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    cache.set(name, parsed);
    return parsed;
  } catch {
    const clone = structuredClone(fallback);
    cache.set(name, clone);
    return clone;
  }
}

function save(name, data) {
  ensureDir();
  cache.set(name, data);
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
  return data;
}

function update(name, mutator, fallback = {}) {
  const data = load(name, fallback);
  const result = mutator(data) || data;
  return save(name, result);
}

function guildBucket(name, guildId, defaults = {}) {
  const all = load(name, {});
  if (!all[guildId]) {
    all[guildId] = typeof defaults === "function" ? defaults() : { ...defaults };
    save(name, all);
  }
  return all[guildId];
}

function saveGuild(name, guildId, cfg) {
  const all = load(name, {});
  all[guildId] = cfg;
  return save(name, all);
}

module.exports = {
  DATA_DIR,
  load,
  save,
  update,
  guildBucket,
  saveGuild,
};
