const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const downloadRoutes = require("./routes/download");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS agar frontend bisa akses backend
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

// Rate limiter: max 20 request per 15 menit per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Terlalu banyak permintaan dari IP ini. Coba lagi nanti.",
  },
});
app.use("/api/", limiter);

// Middleware
app.use(express.json());
app.use(express.static("public")); // file HTML, JS, CSS di sini

// Routing utama
app.use("/api", downloadRoutes);

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
