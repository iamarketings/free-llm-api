/**
 * controllers/chatController.js
 * ─────────────────────────────────────────────────────────
 * CONTRÔLEUR de chat (POST /chat et POST /v1/chat/completions)
 *
 * Logique de fallback automatique :
 *  - Mode "auto"   → essaie les modèles un par un jusqu'au succès
 *  - Mode "manual" → utilise uniquement le modèle fixé
 *
 * En cas d'échec d'un modèle (timeout, 4xx, 5xx), il est retiré
 * immédiatement de la liste active pour ne plus être retesté.
 */
const axios = require("axios");
const config = require("../config");
const { state, saveConfig } = require("../state/appState");

/**
 * Ajoute le prompt système aux messages si configuré.
 */
function injectSystemPrompt(messages) {
    // Si pas de prompt système configuré, retourne tel quel
    if (!state.system_prompt || state.system_prompt.trim() === "") {
        return messages;
    }

    // Vérifie si un message system existe déjà
    const hasSystem = messages.some(m => m.role === "system");

    if (hasSystem) {
        // Ajoute notre prompt avant le premier message system existant
        return [
            { role: "system", content: state.system_prompt },
            ...messages
        ];
    } else {
        // Ajoute le prompt system en premier
        return [
            { role: "system", content: state.system_prompt },
            ...messages
        ];
    }
}

// Headers d'authentification
const authHeaders = () => ({
    Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
});

/**
 * Gère une requête de chat et la route vers OpenRouter.
 * Supporte les formats :
 *  - { messages: [...] }       → format OpenAI standard
 *  - { prompt: "..." }         → format simplifié
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

    // --- Paramètres optionnels à transmettre à OpenRouter ---
    const optional = {};
    for (const key of ["temperature", "max_tokens", "top_p", "stream", "stop"]) {
        if (req.body[key] !== undefined) optional[key] = req.body[key];
    }

    // --- Détermination des modèles cibles ---
    const targets =
        state.mode === "manual" && state.fixed_model
            ? [state.fixed_model]
            : state.active_models.map((m) => m.id);

    if (targets.length === 0) {
        return res.status(503).json({
            error: "Aucun modèle disponible. Le scan initial est peut-être en cours.",
        });
    }

    // --- Tentatives successives (fallback automatique) ---
    for (const modelId of targets) {
        try {
            const response = await axios.post(
                config.OPENROUTER_CHAT_URL,
                { model: modelId, messages, ...optional },
                { headers: authHeaders(), timeout: 60_000 }
            );

            if (response.status === 200) {
                // Succès : mise à jour des stats et de l'historique
                state.usage_stats.success++;
                state.history.unshift({
                    time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                    model: modelId,
                    prompt: String(messages.at(-1)?.content ?? "").slice(0, 40),
                    status: "OK",
                });
                // On ne garde que les HISTORY_MAX dernières entrées
                state.history = state.history.slice(0, config.HISTORY_MAX);
                saveConfig();

                return res.json(response.data);
            }

            // Modèle en erreur → retrait de la liste active
            console.warn(`❌ ${modelId} → HTTP ${response.status}, retiré.`);
            state.active_models = state.active_models.filter((m) => m.id !== modelId);

        } catch (err) {
            if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
                console.warn(`⏱️  Timeout sur ${modelId}, retiré.`);
            } else {
                console.error(`⚠️  Erreur sur ${modelId}: ${err.message}`);
            }
            // Dans tous les cas, on retire le modèle et on continue avec le suivant
            state.active_models = state.active_models.filter((m) => m.id !== modelId);
        }
    }

    // Aucun modèle n'a répondu
    state.usage_stats.errors++;
    saveConfig();
    return res.status(503).json({ error: "Aucun modèle n'a répondu. Essayez /refresh." });
}

module.exports = { handleChat };
