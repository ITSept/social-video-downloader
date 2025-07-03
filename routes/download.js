const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const { detectPlatform } = require("../utils/platformDetector");
const { getCache, setCache } = require("../utils/fileCache");
const crypto = require("crypto");
const path = require("path");

function isValidURL(url) {
  const allowed = [
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
  ];
  try {
    const u = new URL(url);
    return allowed.some((domain) => u.hostname.includes(domain));
  } catch {
    return false;
  }
}

router.post("/fetch-info", async (req, res) => {
  const { url } = req.body;
  if (!url || !isValidURL(url)) {
    return res
      .status(400)
      .json({ error: "Link tidak valid atau tidak diizinkan." });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return res
      .status(400)
      .json({ error: "Platform tidak dikenali atau tidak didukung." });
  }

  const cacheKey = "info:" + crypto.createHash("md5").update(url).digest("hex");
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log("📦 Ditemukan di cache");
    return res.json(cached);
  }

  const isWindows = process.platform === "win32";
  const ytDlpCmd = isWindows
    ? `"${path.join(__dirname, "..", "yt-dlp.exe")}"`
    : "yt-dlp";

  const command = `${ytDlpCmd} -j "${url}"`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", stderr);
      return res.status(500).json({ error: "Gagal mengambil data video." });
    }

    let data;
    try {
      data = JSON.parse(stdout);
    } catch (e) {
      console.error("❌ Gagal parse JSON:", e);
      return res.status(500).json({ error: "Gagal membaca data dari yt-dlp." });
    }

    if (!data || !Array.isArray(data.formats)) {
      return res
        .status(500)
        .json({ error: "Data video tidak valid atau tidak tersedia." });
    }

    const videoFormats = [];
    const audioFormats = [];
    const seenVideoKeys = new Set();
    const seenAudioKeys = new Set();

    data.formats.forEach((f) => {
      if (!f.url) return;

      const isVideo = f.vcodec !== "none";
      const isAudio = f.acodec !== "none";
      const resolution = f.height ? `${f.height}p` : null;
      const ext = (f.ext || "unknown").toLowerCase();

      const filesizeRaw = f.filesize || f.filesize_approx;
      const filesizeMB =
        typeof filesizeRaw === "number"
          ? Math.round((filesizeRaw / 1024 / 1024) * 10) / 10
          : null;

      if (isVideo && resolution && filesizeMB) {
        const key = `${resolution}-${ext}`;
        if (!seenVideoKeys.has(key)) {
          seenVideoKeys.add(key);
          videoFormats.push({
            resolution,
            ext,
            filesize: filesizeMB,
            url: f.url,
          });
        }
      }

      if (!isVideo && isAudio && filesizeMB) {
        const key = `${ext}-${filesizeMB}`;
        if (!seenAudioKeys.has(key)) {
          seenAudioKeys.add(key);
          audioFormats.push({
            ext,
            bitrate: f.abr ? `${f.abr} kbps` : null,
            filesize: filesizeMB,
            url: f.url,
          });
        }
      }
    });

    const result = {
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      uploader: data.uploader,
      videoFormats,
      audioFormats,
    };

    await setCache(cacheKey, result);
    console.log("✅ Disimpan ke cache");
    res.json(result);
  });
});

module.exports = router;
