/**
 * controllers/adminController.js
 * ─────────────────────────────────────────────────────────
 * CONTRÔLEUR d'administration :
 *  - POST /config   → change le mode, la clé API, le mot de passe dashboard
 *  - POST /refresh  → relance un fetch + nettoyage immédiat
 *  - GET  /health   → état du service en JSON
 *  - GET  /v1/models → liste des modèles au format OpenAI
 */
const { state, saveConfig } = require("../state/appState");
const { restartAutoRefresh, fullRefresh } = require("../models/modelManager");
const logger = require("../utils/logger");

/**
 * Met à jour la configuration (mode, modèle fixé, prompt système, clé API, mot de passe).
 */
function updateConfig(req, res) {
    const { mode, model_id, system_prompt, action, refresh_interval, request_timeout, api_key, dashboard_password, current_password } = req.body;

    // ── Prompt système ──────────────────────────────────
    if (action === "system_prompt" && system_prompt !== undefined) {
        state.system_prompt = system_prompt;
        logger.info("Configuration mise à jour: Prompt système");
    }

    // ── Mode de routage ─────────────────────────────────
    if (action === "mode" || !action) {
        state.mode = mode;
        state.fixed_model = mode === "manual" ? (model_id || null) : null;
        logger.info(`Mode changé en : ${mode.toUpperCase()} ${model_id ? `(${model_id})` : ''}`);
    }

    // ── Paramètres avancés ──────────────────────────────
    if (action === "advanced_settings") {
        if (!state.config_overrides) state.config_overrides = {};
        if (refresh_interval) {
            state.config_overrides.refresh_interval = parseInt(refresh_interval);
            restartAutoRefresh();
        }
        if (request_timeout) {
            state.config_overrides.request_timeout = parseInt(request_timeout);
        }
        logger.info(`Paramètres avancés mis à jour: Intervalle=${refresh_interval}m, Timeout=${request_timeout}s`);
    }

    // ── Clé API OpenRouter ──────────────────────────────
    if (action === "api_key") {
        state.api_key = (api_key || "").trim();
        logger.info(`Clé API OpenRouter ${state.api_key ? "mise à jour" : "supprimée (mode public)"}`);
    }

    // ── Mot de passe Dashboard ──────────────────────────
    if (action === "dashboard_password") {
        // Vérifier l'ancien mot de passe si un mdp est déjà défini
        if (state.dashboard_password && current_password !== state.dashboard_password) {
            return res.redirect("/?error=wrong_password");
        }
        state.dashboard_password = (dashboard_password || "").trim();
        logger.info(`Mot de passe dashboard ${state.dashboard_password ? "mis à jour" : "supprimé (accès libre)"}`);
        // Déconnecter pour forcer la reconnexion si nouveau mdp
        if (state.dashboard_password) {
            res.clearCookie("dfp_auth");
        }
    }

    saveConfig();
    return res.redirect("/");
}

/**
 * Gestion de la connexion au dashboard (POST /login).
 */
function loginDashboard(req, res) {
    const { password } = req.body;
    if (password === state.dashboard_password) {
        // Cookie de session simple (1 jour)
        res.cookie("dfp_auth", state.dashboard_password, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: "lax"
        });
        return res.redirect("/");
    }
    return res.redirect("/login?error=1");
}

/**
 * Déconnexion du dashboard (GET /logout).
 */
function logoutDashboard(req, res) {
    res.clearCookie("dfp_auth");
    return res.redirect("/login");
}

/**
 * Déclenche un rafraîchissement complet (fetch + nettoyage).
 */
async function refreshModels(req, res) {
    if (state.is_syncing) {
        return res.redirect("/?error=syncing");
    }

    // Lance le refresh (ne bloque pas la réponse pour éviter le timeout navigateur)
    fullRefresh().catch(err => logger.error(`Erreur refresh manuel: ${err.message}`));

    // Redirection immédiate, le dashboard affichera l'état "is_syncing"
    return res.redirect("/");
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
        api_key_configured: !!state.api_key,
    });
}

/**
 * Liste les modèles au format standard OpenAI.
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

module.exports = { updateConfig, refreshModels, healthCheck, listModels, loginDashboard, logoutDashboard };
