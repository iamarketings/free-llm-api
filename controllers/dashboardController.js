/**
 * controllers/dashboardController.js
 * ─────────────────────────────────────────────────────────
 * CONTRÔLEUR du tableau de bord (GET /)
 * Prépare les données et délègue le rendu à la vue EJS.
 */
const { state } = require("../state/appState");

/**
 * Affiche le dashboard principal.
 * Injecte l'état courant dans la vue dashboard.ejs.
 */
function showDashboard(req, res) {
    res.render("dashboard", {
        models: [...state.active_models].sort((a, b) => (b.lastTest?.avgScore || 0) - (a.lastTest?.avgScore || 0)),
        mode: state.mode,
        fixed_model: state.fixed_model,
        systemPrompt: state.system_prompt,
        stats: state.usage_stats,
        history: state.history,
        syncing: state.is_syncing,
        last_sync: state.last_sync,
        recommendations: state.modelRecommendations || [],
        logs: state.system_logs || [],
        config_overrides: state.config_overrides || {},
    });
}

module.exports = { showDashboard };
