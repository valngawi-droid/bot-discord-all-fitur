// ==========================================
// Modul API Pterodactyl (Application API)
// ==========================================
const axios = require("axios");

const PTERO_URL = (process.env.PTERO_URL || "").replace(/\/+$/, "");
const PTERO_APP_KEY = process.env.PTERO_APP_KEY || "";

const api = axios.create({
  baseURL: `${PTERO_URL}/api/application`,
  headers: {
    Authorization: `Bearer ${PTERO_APP_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Generate password acak
function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// ============ USER ============
async function createUser({ username, email, firstName, lastName, password }) {
  const pwd = password || generatePassword();
  const res = await api.post("/users", {
    username: username.toLowerCase().replace(/[^a-z0-9_.-]/g, ""),
    email,
    first_name: firstName || username,
    last_name: lastName || "Panel",
    password: pwd,
  });
  return { user: res.data.attributes, password: pwd };
}

async function findUserByEmail(email) {
  const res = await api.get(`/users?filter[email]=${encodeURIComponent(email)}`);
  const list = res.data.data;
  return list.length > 0 ? list[0].attributes : null;
}

async function getOrCreateUser({ username, email }) {
  const existing = await findUserByEmail(email);
  if (existing) return { user: existing, password: null, existed: true };
  const created = await createUser({ username, email });
  return { ...created, existed: false };
}

async function listUsers(page = 1) {
  const res = await api.get(`/users?page=${page}&per_page=50`);
  return res.data;
}

async function deleteUser(userId) {
  await api.delete(`/users/${userId}`);
  return true;
}

// ============ SERVER ============
async function getEggInfo(nestId, eggId) {
  const res = await api.get(
    `/nests/${nestId}/eggs/${eggId}?include=variables`
  );
  return res.data.attributes;
}

/**
 * Buat server panel
 * @param {object} opts { userId, name, ram (MB, 0 = unlimited), disk (MB, 0 = unlimited), cpu (%, 0 = unlimited) }
 */
async function createServer({ userId, name, ram, disk, cpu }) {
  const eggId = parseInt(process.env.PTERO_EGG_ID || "15");
  const nestId = parseInt(process.env.PTERO_NEST_ID || "5");
  const locationId = parseInt(process.env.PTERO_LOCATION_ID || "1");

  // Ambil environment default dari egg
  let environment = {};
  let startup = process.env.PTERO_STARTUP || "";
  let dockerImage = process.env.PTERO_DOCKER_IMAGE || "";
  try {
    const egg = await getEggInfo(nestId, eggId);
    if (!startup) startup = egg.startup;
    if (!dockerImage) dockerImage = egg.docker_image;
    if (egg.relationships && egg.relationships.variables) {
      for (const v of egg.relationships.variables.data) {
        environment[v.attributes.env_variable] = v.attributes.default_value;
      }
    }
  } catch (e) {
    // fallback environment umum untuk egg nodejs
    environment = {
      GIT_ADDRESS: "",
      BRANCH: "",
      USERNAME: "",
      ACCESS_TOKEN: "",
      CMD_RUN: "npm start",
      AUTO_UPDATE: "0",
      NODE_PACKAGES: "",
      UNNODE_PACKAGES: "",
      JS_FILE: "index.js",
    };
  }

  const res = await api.post("/servers", {
    name,
    user: userId,
    egg: eggId,
    docker_image: dockerImage,
    startup,
    environment,
    limits: {
      memory: ram, // 0 = unlimited
      swap: 0,
      disk: disk,
      io: 500,
      cpu: cpu,
    },
    feature_limits: {
      databases: 2,
      backups: 2,
      allocations: 1,
    },
    deploy: {
      locations: [locationId],
      dedicated_ip: false,
      port_range: [],
    },
  });
  return res.data.attributes;
}

async function listServers(page = 1) {
  const res = await api.get(`/servers?page=${page}&per_page=50`);
  return res.data;
}

async function deleteServer(serverId) {
  await api.delete(`/servers/${serverId}`);
  return true;
}

// ============ PAKET RESOURCE ============
const PLANS = {
  "1gb":  { ram: 1024,  disk: 1024,  cpu: 40,  label: "1GB RAM / 40% CPU" },
  "2gb":  { ram: 2048,  disk: 2048,  cpu: 60,  label: "2GB RAM / 60% CPU" },
  "3gb":  { ram: 3072,  disk: 3072,  cpu: 80,  label: "3GB RAM / 80% CPU" },
  "4gb":  { ram: 4096,  disk: 4096,  cpu: 100, label: "4GB RAM / 100% CPU" },
  "5gb":  { ram: 5120,  disk: 5120,  cpu: 120, label: "5GB RAM / 120% CPU" },
  "6gb":  { ram: 6144,  disk: 6144,  cpu: 140, label: "6GB RAM / 140% CPU" },
  "7gb":  { ram: 7168,  disk: 7168,  cpu: 160, label: "7GB RAM / 160% CPU" },
  "8gb":  { ram: 8192,  disk: 8192,  cpu: 180, label: "8GB RAM / 180% CPU" },
  "9gb":  { ram: 9216,  disk: 9216,  cpu: 200, label: "9GB RAM / 200% CPU" },
  "10gb": { ram: 10240, disk: 10240, cpu: 220, label: "10GB RAM / 220% CPU" },
  "unli": { ram: 0,     disk: 0,     cpu: 0,   label: "UNLIMITED" },
};

/**
 * Fungsi utama: buat user + server sekaligus
 */
async function autoCreatePanel({ username, plan }) {
  const planData = PLANS[plan];
  if (!planData) throw new Error(`Paket tidak dikenal: ${plan}`);

  const cleanName = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = `${cleanName}@panel.gg`;

  const { user, password, existed } = await getOrCreateUser({
    username: cleanName,
    email,
  });

  const server = await createServer({
    userId: user.id,
    name: `${cleanName}-server`,
    ram: planData.ram,
    disk: planData.disk,
    cpu: planData.cpu,
  });

  return {
    panelUrl: PTERO_URL,
    username: user.username,
    email: user.email,
    password: password || "(akun sudah ada, pakai password lama)",
    existed,
    server: {
      id: server.id,
      name: server.name,
      ram: planData.ram === 0 ? "Unlimited" : `${planData.ram} MB`,
      disk: planData.disk === 0 ? "Unlimited" : `${planData.disk} MB`,
      cpu: planData.cpu === 0 ? "Unlimited" : `${planData.cpu}%`,
      plan: planData.label,
    },
  };
}

module.exports = {
  createUser,
  findUserByEmail,
  getOrCreateUser,
  listUsers,
  deleteUser,
  createServer,
  listServers,
  deleteServer,
  autoCreatePanel,
  generatePassword,
  PLANS,
};
