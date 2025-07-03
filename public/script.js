// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js loaded");

  const form = document.getElementById("download-form");
  const urlInput = document.getElementById("video-url");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    console.log("🚀 Submit link:", url);

    const result = document.getElementById("result");
    const errorMsg = document.getElementById("error-msg");
    const videoDiv = document.getElementById("video-formats");
    const audioDiv = document.getElementById("audio-formats");
    const loading = document.getElementById("loading");

    // Reset state
    result.classList.add("hidden");
    errorMsg.classList.add("hidden");
    videoDiv.innerHTML = "";
    audioDiv.innerHTML = "";
    loading.classList.remove("hidden"); // 🔵 show spinner

    if (!url) {
      loading.classList.add("hidden");
      return;
    }

    try {
      // Fetch metadata
      const response = await fetch("/api/fetch-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      console.log("📡 Response status:", response.status);

      const cType = response.headers.get("content-type") || "";
      if (!cType.includes("application/json")) {
        throw new Error("Server returned non‑JSON response.");
      }

      const data = await response.json();
      console.log("📥 Data received:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to process video.");
      }

      // Populate header
      document.getElementById("title").textContent = data.title;
      document.getElementById("uploader").textContent = "By: " + data.uploader;
      document.getElementById("thumbnail").src = data.thumbnail;

      /* ---------- Render video formats ---------- */
      const seenVideo = new Set();
      data.videoFormats.forEach((f) => {
        if (!f.filesize) return; // skip if no size
        const key = `${f.resolution}-${f.ext}`;
        if (seenVideo.has(key)) return;
        seenVideo.add(key);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="border p-2">${f.resolution}</td>
          <td class="border p-2">${f.filesize.toFixed(1)} MB</td>
          <td class="border p-2">${f.ext.toUpperCase()}</td>
          <td class="border p-2 text-center">
            <a href="${f.url}" title="Download ${f.resolution} ${f.ext}"
               target="_blank" download
               class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
               ⬇️ Download
            </a>
          </td>`;
        videoDiv.appendChild(tr);
      });

      /* ---------- Render audio formats ---------- */
      const seenAudio = new Set();
      data.audioFormats.forEach((f) => {
        if (!f.filesize) return;
        const key = `${f.ext}-${f.bitrate}`;
        if (seenAudio.has(key)) return;
        seenAudio.add(key);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="border p-2">${f.ext.toUpperCase()} Audio (${
          f.bitrate
        })</td>
          <td class="border p-2">${f.filesize.toFixed(1)} MB</td>
          <td class="border p-2 text-center">
            <a href="${f.url}" title="Download ${f.ext} ${f.bitrate}"
               target="_blank" download
               class="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
               ⬇️ Download
            </a>
          </td>`;
        audioDiv.appendChild(tr);
      });

      result.classList.remove("hidden");
    } catch (err) {
      console.error("❌ ERROR:", err);
      errorMsg.textContent = err.message;
      errorMsg.classList.remove("hidden");
    } finally {
      loading.classList.add("hidden"); // 🔵 hide spinner
    }
  });
});
