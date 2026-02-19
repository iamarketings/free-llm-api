/**
 * controllers/adminController.js
 * ─────────────────────────────────────────────────────────
 * CONTRÔLEUR d'administration :
 *  - POST /config   → change le mode (auto / manuel)
 *  - POST /refresh  → relance un fetch + nettoyage immédiat
 *  - GET  /health   → état du service en JSON
 *  - GET  /v1/models → liste des modèles au format OpenAI
 */
const { state, saveConfig } = require("../state/appState");
const { restartAutoRefresh } = require("../models/modelManager");
const logger = require("../utils/logger");

/**
 * Met à jour la configuration (mode, modèle fixé, prompt système).
 * Redirige vers le dashboard après sauvegarde.
 */
function updateConfig(req, res) {
    const { mode, model_id, system_prompt, action, refresh_interval, request_timeout } = req.body;

    // Gestion du prompt système
    if (action === "system_prompt" && system_prompt !== undefined) {
        state.system_prompt = system_prompt;
        logger.info("Configuration mise à jour: Prompt système");
    }

    // Gestion du mode
    if (action === "mode" || !action) {
        state.mode = mode;
        state.fixed_model = mode === "manual" ? (model_id || null) : null;
        logger.info(`Mode changé en : ${mode.toUpperCase()} ${model_id ? `(${model_id})` : ''}`);
    }

    // Gestion des paramètres avancés
    if (action === "advanced_settings") {
        if (!state.config_overrides) state.config_overrides = {};

        if (refresh_interval) {
            state.config_overrides.refresh_interval = parseInt(refresh_interval);
            restartAutoRefresh(); // Applique le changement immédiatement
        }

        if (request_timeout) {
            state.config_overrides.request_timeout = parseInt(request_timeout);
        }
        logger.info(`Paramètres avancés mis à jour: Intervalle=${refresh_interval}m, Timeout=${request_timeout}s`);
    }

    saveConfig();

    return res.redirect("/");
}

/**
 * Déclenche un rafraîchissement complet (fetch + nettoyage)
 * sans redémarrer le serveur.
 */
async function refreshModels(req, res) {
    if (state.is_syncing) {
        return res.status(202).json({ message: "Sync déjà en cours, patientez." });
    }

    // Lance le rafraîchissement en arrière-plan (non bloquant)
    fullRefresh().catch(console.error);

    return res.json({
        message: "Rafraîchissement lancé.",
        models_loaded: state.active_models.length,
    });
}

/**
 * Endpoint de santé — utile pour les healthchecks Docker/Nginx.
 */
function healthCheck(req, res) {
    return res.json({
        status: "ok",
        models_available: state.active_models.length,
        mode: state.mode,
        is_syncing: state.is_syncing,
        last_sync: state.last_sync,
    });
}

/**
 * Liste les modèles au format standard OpenAI.
 * Compatible avec Open-WebUI, LiteLLM, etc.
 */
function listModels(req, res) {
    const data = state.active_models.map((m) => ({
        id: m.id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: m.id.includes("/") ? m.id.split("/")[0] : "openrouter",
        context_length: m.context_length || 0,
    }));

    return res.json({ object: "list", data });
}

module.exports = { updateConfig, refreshModels, healthCheck, listModels };
