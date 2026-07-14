// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";

import authRoutes from "./routes/auth.js";
import excelExport from "./routes/excel.js";
import productosRoutes from "./routes/productos.js";
import initSocketServer from "./server.js";

dotenv.config();

const app = express();

// === CORS ===
const allowedOrigins = [
  "http://localhost:5173",
  "https://mulaplateada.netlify.app",
  "https://mulaplateada-backend.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(new Error("CORS no permite este origen: " + origin), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// === MIDDLEWARES ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === LOG SIMPLE PARA DEBUG ===
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.originalUrl}`);
  next();
});

// === RUTAS ===
app.get("/", (req, res) => res.send("🚀 API funcionando correctamente"));

app.use("/api/auth", authRoutes);
app.use("/api/report", excelExport);
app.use("/api/productos", productosRoutes);

// === SERVIDOR + SOCKET.IO ===
const server = createServer(app);

// Inicializamos Socket.IO de forma asíncrona antes de escuchar
(async () => {
  try {
    await initSocketServer(server, allowedOrigins);
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err);
    process.exit(1); // salir si no se puede iniciar correctamente
  }
})();

// === MANEJO DE ERRORES ===
app.use((err, req, res, next) => {
  console.error("❌ Error global:", err.message);
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});
