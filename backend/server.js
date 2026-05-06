import express            from "express";
import cors               from "cors";
import dotenv             from "dotenv";
import path               from "path";
import { fileURLToPath }  from "url";
import rateLimit          from "express-rate-limit";

import { connectDB }      from "./config/db.js";
import authRoutes         from "./routes/authRoutes.js";
import analysisRoutes     from "./routes/analysisRoutes.js";
import newsRoutes         from "./routes/new.routes.js";
import correlationsRoutes from "./routes/correlationsRoutes.js";
import portfolioRoutes    from "./routes/portfolioRoutes.js";
import advancedRoutes     from "./routes/advancedRoutes.js";
import stripeRoutes       from "./routes/stripeRoutes.js";
import suggestionRoutes   from "./routes/suggestionRoutes.js";
import postRoutes         from "./routes/postRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();
const PORT       = process.env.PORT || 3001;

app.use(cors({
  origin:         "*",
  methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { ok: false, error: "Demasiadas peticiones. Espera unos minutos." }
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { ok: false, error: "Demasiados intentos de login. Espera 15 minutos." }
});

const limiterAnalysis = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      100,
  message:  { ok: false, error: "Límite de análisis por hora alcanzado." }
});

app.use("/auth/login",    limiterLogin);
app.use("/auth/register", limiterLogin);
app.use("/analysis",      limiterAnalysis);
app.use("/advanced",      limiterAnalysis);
app.use(limiterGeneral);

app.use("/auth",            authRoutes);
app.use("/analysis",        analysisRoutes);
app.use("/news",            newsRoutes);
app.use("/fx/correlations", correlationsRoutes);
app.use("/portfolio",       portfolioRoutes);
app.use("/advanced",        advancedRoutes);
app.use("/stripe",          stripeRoutes);
app.use("/suggestions",     suggestionRoutes);
app.use("/posts",           postRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("🚀 Servidor en http://localhost:" + PORT);
    });
  })
  .catch(err => {
    console.error("❌ Error al arrancar:", err.message);
    process.exit(1);
  });