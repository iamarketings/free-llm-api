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
        api_key: "",            // Clé OpenRouter — vide = modèles publics gratuits uniquement
        dashboard_password: "", // Mot de passe du dashboard — vide = accès libre
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
        config_overrides: state.config_overrides,
        api_key: state.api_key || "",
        dashboard_password: state.dashboard_password || "",
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
    mode: persisted.mode,
    fixed_model: persisted.fixed_model,
    system_prompt: persisted.system_prompt,
    usage_stats: persisted.usage_stats,
    config_overrides: persisted.config_overrides || {},
    api_key: persisted.api_key || "",               // Clé API OpenRouter (optionnelle)
    dashboard_password: persisted.dashboard_password || "", // Mot de passe dashboard ("" = libre)

    // --- En mémoire uniquement ---
    active_models: [],
    history: [],
    is_syncing: false,
    last_sync: null,
    modelRecommendations: [],
    system_logs: [],
};

module.exports = { state, saveConfig };
