const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", ".cache");

// Buat folder .cache jika belum ada
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

function getCache(key) {
  const filePath = path.join(CACHE_DIR, key + ".json");

  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const now = Date.now();

    if (now > data.expiry) {
      fs.unlinkSync(filePath); // hapus jika expired
      return null;
    }

    return data.value;
  } catch (err) {
    console.error("File cache error (read):", err.message);
    return null;
  }
}

function setCache(key, value, ttl = 6 * 60 * 60 * 1000) {
  const filePath = path.join(CACHE_DIR, key + ".json");

  const data = {
    value,
    expiry: Date.now() + ttl,
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("File cache error (write):", err.message);
  }
}

module.exports = { getCache, setCache };
