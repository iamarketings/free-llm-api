/**
 * utils/logger.js
 * ─────────────────────────────────────────────────────────
 * Système de logs centralisé.
 * Enregistre les logs dans la console ET dans l'état global
 * pour affichage dans le dashboard admin.
 */
const { state } = require("../state/appState");

const LOG_MAX_SIZE = 100;

function addLog(level, message) {
    // Console output standard
    const timestamp = new Date().toLocaleTimeString("fr-FR");
    if (level === "error") console.error(`❌ [${timestamp}] ${message}`);
    else if (level === "warn") console.warn(`⚠️  [${timestamp}] ${message}`);
    else console.log(`ℹ️  [${timestamp}] ${message}`);

    // Stockage en mémoire pour le dashboard
    if (!state.system_logs) state.system_logs = [];

    state.system_logs.unshift({
        time: timestamp,
        level,
        message
    });

    // Rotation des logs
    if (state.system_logs.length > LOG_MAX_SIZE) {
        state.system_logs = state.system_logs.slice(0, LOG_MAX_SIZE);
    }
}

module.exports = {
    info: (msg) => addLog("info", msg),
    warn: (msg) => addLog("warn", msg),
    error: (msg) => addLog("error", msg),
    getLogs: () => state.system_logs || []
};
