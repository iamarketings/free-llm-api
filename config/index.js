/**
 * config/index.js
 * ─────────────────────────────────────────────────────────
 * Centralise toute la configuration de l'application.
 * Les valeurs sensibles viennent du fichier .env.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = {
    // Clé API OpenRouter (optionnelle — OpenRouter est accessible sans clé pour les modèles gratuits)
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",

    // URLs de l'API OpenRouter
    OPENROUTER_MODELS_URL: "https://openrouter.ai/api/v1/models",
    OPENROUTER_CHAT_URL: "https://openrouter.ai/api/v1/chat/completions",

    // Port du serveur Express
    PORT: parseInt(process.env.PORT || "8000", 10),

    // Intervalle de rafraîchissement automatique (en ms) : 15 minutes
    REFRESH_INTERVAL_MS: 15 * 60 * 1000,

    // Timeout des tests de modèle (en ms)
    MODEL_TEST_TIMEOUT_MS: 10_000,

    // Nombre max d'entrées dans l'historique
    HISTORY_MAX: 50,
};

// Clé optionnelle — on informe mais on ne bloque pas le démarrage
if (!config.OPENROUTER_API_KEY) {
    console.warn("⚠️  Aucune OPENROUTER_API_KEY — le proxy fonctionnera avec les modèles publics gratuits.");
}

module.exports = config;
