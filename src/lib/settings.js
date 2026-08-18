const db = require("./db");
const { WEB_NAME, DEFAULT_BOT_NAME } = require("./brand");

function defaults() {
  return {
    botName: DEFAULT_BOT_NAME,
    activity: DEFAULT_BOT_NAME,
    activityType: "Watching",
  };
}

function get() {
  const data = db.load("settings", defaults());
  if (!data.botName) data.botName = DEFAULT_BOT_NAME;
  if (!data.activity) data.activity = DEFAULT_BOT_NAME;
  if (!data.activityType) data.activityType = "Watching";
  return data;
}

function save(partial = {}) {
  const cur = get();
  if (partial.botName != null) cur.botName = String(partial.botName).trim().slice(0, 32) || DEFAULT_BOT_NAME;
  if (partial.activity != null) cur.activity = String(partial.activity).trim().slice(0, 64) || cur.botName;
  if (partial.activityType && ["Playing", "Watching", "Listening", "Competing"].includes(partial.activityType)) {
    cur.activityType = partial.activityType;
  }
  db.save("settings", cur);
  return { ...cur, webName: WEB_NAME };
}

function publicView() {
  const s = get();
  return { ...s, webName: WEB_NAME };
}

module.exports = { get, save, publicView, WEB_NAME, DEFAULT_BOT_NAME };
