/**
 * server.js
 * ─────────────────────────────────────────────────────────
 * Point d'entrée de l'application.
 * Configure Express, démarre le serveur et lance le modèle.
 */
const express = require("express");
const path = require("path");
const config = require("./config/index");
const routes = require("./routes");
const { startAutoRefresh } = require("./models/modelManager");
const { saveConfig } = require("./state/appState");

const app = express();

// ── Middlewares ────────────────────────────────────────
app.use(express.json());          // Parse les corps JSON
app.use(express.urlencoded({ extended: true })); // Parse les formulaires HTML

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
    console.log("⚡ Dynamic Free Proxy — Node.js v2.0");

    // Lance le chargement des modèles (immédiat + nettoyage en fond)
    await startAutoRefresh();

    app.listen(config.PORT, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${config.PORT}`);
        console.log(`   Dashboard  → http://localhost:${config.PORT}/`);
        console.log(`   API Chat   → POST http://localhost:${config.PORT}/v1/chat/completions`);
        console.log(`   Modèles    → GET  http://localhost:${config.PORT}/v1/models`);
    });

    // Sauvegarde propre à l'arrêt du processus
    process.on("SIGINT", () => { saveConfig(); process.exit(0); });
    process.on("SIGTERM", () => { saveConfig(); process.exit(0); });
}

start().catch((err) => {
    console.error("❌ Erreur au démarrage:", err.message);
    process.exit(1);
});
