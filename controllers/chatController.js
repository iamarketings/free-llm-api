/**
 * controllers/chatController.js
 * ─────────────────────────────────────────────────────────
 * CONTRÔLEUR de chat (POST /chat et POST /v1/chat/completions)
 *
 * Logique de fallback automatique :
 *  - Mode "auto"   → essaie les modèles un par un jusqu'au succès
 *  - Mode "manual" → utilise uniquement le modèle fixé
 *
 * Un modèle n'est retiré que s'il génère une erreur réseau
 * (timeout, connexion refusée) — jamais sur 401/403/429.
 */
const axios = require("axios");
const config = require("../config/index");
const { state, saveConfig } = require("../state/appState");

/**
 * Retourne la clé API à utiliser : celle configurée dans l'UI en priorité,
 * puis celle du fichier .env, sinon chaîne vide (requête publique).
 */
function getApiKey() {
    return state.api_key || config.OPENROUTER_API_KEY || "";
}

/**
 * Headers d'authentification, toujours à jour (clé dynamique).
 */
function authHeaders() {
    const key = getApiKey();
    return {
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Free LLM API Proxy",
    };
}

/**
 * Ajoute le prompt système aux messages si configuré.
 */
function injectSystemPrompt(messages) {
    if (!state.system_prompt || state.system_prompt.trim() === "") {
        return messages;
    }
    const hasSystem = messages.some(m => m.role === "system");
    if (hasSystem) {
        return [{ role: "system", content: state.system_prompt }, ...messages];
    }
    return [{ role: "system", content: state.system_prompt }, ...messages];
}

/**
 * Détermine si une erreur doit provoquer le retrait du modèle.
 * On retire UNIQUEMENT sur erreur réseau, pas sur 401/403/429.
 */
function shouldRemoveModel(err) {
    if (err.code === "ECONNABORTED") return true;          // timeout
    if (err.code === "ECONNREFUSED") return true;          // serveur mort
    if (err.message && err.message.toLowerCase().includes("timeout")) return true;
    if (err.response) {
        const status = err.response.status;
        // 401/403 = problème de clé → modèle OK, ne pas retirer
        // 429 = rate-limit → modèle OK, ne pas retirer
        // 5xx = erreur serveur temporaire → retirer prudemment
        if (status === 401 || status === 403 || status === 429) return false;
        if (status >= 500) return true;
    }
    return false;
}

/**
 * Gère une requête de chat et la route vers OpenRouter.
 */
async function handleChat(req, res) {
    // --- Parsing du corps ---
    let messages = req.body.messages;
    if (!messages && req.body.prompt) {
        messages = [{ role: "user", content: req.body.prompt }];
    }
    if (!messages || messages.length === 0) {
        return res.status(400).json({ error: "Paramètre 'messages' ou 'prompt' requis." });
    }

    // --- Injection du prompt système ---
    messages = injectSystemPrompt(messages);

    // --- Paramètres optionnels ---
    const optional = {};
    for (const key of ["temperature", "max_tokens", "top_p", "stream", "stop"]) {
        if (req.body[key] !== undefined) optional[key] = req.body[key];
    }

    // --- Modèles cibles ---
    const targets =
        state.mode === "manual" && state.fixed_model
            ? [state.fixed_model]
            : state.active_models.map((m) => m.id);

    if (targets.length === 0) {
        return res.status(503).json({
            error: "Aucun modèle disponible. Le scan initial est peut-être en cours.",
        });
    }

    const timeout = (state.config_overrides?.request_timeout || 30) * 1000;

    // --- Tentatives successives (fallback) ---
    for (const modelId of targets) {
        try {
            const response = await axios.post(
                config.OPENROUTER_CHAT_URL,
                { model: modelId, messages, ...optional },
                { headers: authHeaders(), timeout }
            );

            if (response.status === 200) {
                state.usage_stats.success++;
                state.history.unshift({
                    time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                    model: modelId,
                    prompt: String(messages.at(-1)?.content ?? "").slice(0, 40),
                    status: "OK",
                });
                state.history = state.history.slice(0, config.HISTORY_MAX);
                saveConfig();
                return res.json(response.data);
            }

            // Mauvaise réponse non-exception (rare avec Axios)
            console.warn(`⚠️  ${modelId} → HTTP ${response.status}`);

        } catch (err) {
            const status = err.response?.status;
            const remove = shouldRemoveModel(err);

            if (remove) {
                console.warn(`❌ ${modelId} retiré (${err.code || status || err.message})`);
                state.active_models = state.active_models.filter((m) => m.id !== modelId);
            } else {
                // Erreur de clé ou rate-limit → passer au modèle suivant sans retirer
                console.warn(`⚠️  ${modelId} → ${status || err.message} (modèle conservé)`);
            }

            // Si c'est une erreur de clé globale (401) et mode auto, on log et on sort
            if (status === 401) {
                console.warn("🔑 Erreur 401 — vérifiez votre clé API OpenRouter.");
            }
        }
    }

    // Aucun modèle n'a répondu
    state.usage_stats.errors++;
    saveConfig();
    return res.status(503).json({ error: "Aucun modèle n'a répondu. Essayez /refresh." });
}

module.exports = { handleChat };
