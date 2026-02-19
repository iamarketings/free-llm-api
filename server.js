/**
 * server.js
 * ─────────────────────────────────────────────────────────
 * Point d'entrée de l'application.
 * Configure Express, le middleware d'auth, et démarre le serveur.
 */
const express = require("express");
const path = require("path");
const config = require("./config/index");
const routes = require("./routes");
const { startAutoRefresh } = require("./models/modelManager");
const { saveConfig, state } = require("./state/appState");

const app = express();

// ── Middlewares ────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser simple (sans dépendance)
app.use((req, res, next) => {
    const cookies = {};
    const raw = req.headers.cookie || "";
    raw.split(";").forEach(part => {
        const [k, ...v] = part.trim().split("=");
        if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
    });
    req.cookies = cookies;
    next();
});

// ── Middleware d'authentification Dashboard ─────────────
// Les routes API (/v1/*, /health) ne sont PAS protégées
app.use((req, res, next) => {
    const pwd = state.dashboard_password;

    // Pas de mot de passe défini → accès libre
    if (!pwd) return next();

    // Routes publiques : login, logout, API, health
    const publicPaths = ["/login", "/logout", "/health", "/v1/"];
    if (publicPaths.some(p => req.path.startsWith(p))) return next();

    // Cookie valide ?
    if (req.cookies.dfp_auth === pwd) return next();

    // Sinon → page de login
    return res.redirect("/login");
});

// ── Moteur de vues EJS ─────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Routes ─────────────────────────────────────────────
app.use("/", routes);

// ── Erreurs 404 ────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable.` });
});

// ── Démarrage ──────────────────────────────────────────
async function start() {
    console.log("⚡ Dynamic Free Proxy — Node.js v2.4");

    await startAutoRefresh();

    app.listen(config.PORT, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${config.PORT}`);
        console.log(`   Dashboard  → http://localhost:${config.PORT}/`);
        console.log(`   API Chat   → POST http://localhost:${config.PORT}/v1/chat/completions`);
        console.log(`   Modèles    → GET  http://localhost:${config.PORT}/v1/models`);
        if (state.dashboard_password) {
            console.log(`   🔒 Dashboard protégé par mot de passe`);
        }
    });

    process.on("SIGINT", () => { saveConfig(); process.exit(0); });
    process.on("SIGTERM", () => { saveConfig(); process.exit(0); });
}

start().catch((err) => {
    console.error("❌ Erreur au démarrage:", err.message);
    process.exit(1);
});
