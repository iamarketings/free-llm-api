/**
 * state/appState.js
 * ─────────────────────────────────────────────────────────
 * Singleton qui contient l'état global en mémoire.
 * Toute modification passe par ce module pour rester cohérent.
 *
 * La config (mode, fixed_model, stats) est persistée dans
 * config.json à chaque changement important.
 */
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config.json");

// Charge la configuration persistée (ou valeurs par défaut)
function loadConfig() {
    const defaults = {
        mode: "auto",
        fixed_model: null,
        system_prompt: "",
        usage_stats: { success: 0, errors: 0 },
    };

    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
            return { ...defaults, ...saved };
        } catch {
            console.warn("⚠️  config.json illisible, reset des paramètres.");
        }
    }
    return defaults;
}

// Écrit la configuration sur disque
function saveConfig() {
    const toSave = {
        mode: state.mode,
        fixed_model: state.fixed_model,
        system_prompt: state.system_prompt,
        usage_stats: state.usage_stats,
        config_overrides: state.config_overrides, // Persist overrides
    };
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2));
    } catch (e) {
        console.error("❌ Impossible de sauvegarder config.json:", e.message);
    }
}

// État chargé au démarrage
const persisted = loadConfig();

const state = {
    // --- Persisté dans config.json ---
    mode: persisted.mode,                // "auto" | "manual"
    fixed_model: persisted.fixed_model,  // ID du modèle fixé ou null
    system_prompt: persisted.system_prompt, // Prompt système personnalisé
    usage_stats: persisted.usage_stats, // { success, errors }
    config_overrides: persisted.config_overrides || {}, // { refresh_interval, timeout, etc. }

    // --- En mémoire uniquement ---
    active_models: [],  // Liste des modèles gratuits disponibles
    history: [],        // Historique des dernières requêtes
    is_syncing: false,  // Scan de nettoyage en cours ?
    last_sync: null,    // Heure de la dernière synchro réussie (string)
    modelRecommendations: [], // Recommandations basées sur les tests
    system_logs: [],    // Logs pour l'admin panel
};

module.exports = { state, saveConfig };
