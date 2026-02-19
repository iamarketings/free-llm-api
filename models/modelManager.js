/**
 * models/modelManager.js
 * ─────────────────────────────────────────────────────────
 * MODÈLE (M dans MVC)
 *
 * Responsable de toute la logique liée aux modèles OpenRouter :
 *  1. fetchFreeModels()   → récupère la liste brute des modèles gratuits
 *  2. pruneDeadModels()   → teste tous les modèles en parallèle et retire les morts
 *  3. classifyModels()    → classe les modèles par catégorie (RAG, MOE, Vision, etc.)
 *  4. startAutoRefresh()  → lance la boucle de rafraîchissement automatique
 */
const axios = require("axios");
const config = require("../config/index");
const { state, saveConfig } = require("../state/appState");
const fs = require("fs");
const path = require("path");

// Chemin du fichier de mémoire/classification
const MEMORY_PATH = path.join(__dirname, "..", "modelMemory.json");

// Headers d'authentification communs à toutes les requêtes
const authHeaders = () => ({
    Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
});

/**
 * Charge la mémoire des modèles (scores, classifications, etc.)
 */
const logger = require("../utils/logger");
let refreshIntervalId = null;

// ... imports ...

/**
 * Charge la mémoire des modèles (scores, classifications, etc.)
 */
function loadModelMemory() {
    try {
        if (fs.existsSync(MEMORY_PATH)) {
            return JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8"));
        }
    } catch (e) {
        logger.warn(`⚠️  Impossible de charger modelMemory.json: ${e.message}`);
    }
    return { classifications: {}, scores: {}, recommendations: [] };
}

/**
 * Sauvegarde la mémoire des modèles
 */
function saveModelMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) {
        logger.error(`❌ Impossible de sauvegarder modelMemory.json: ${e.message}`);
    }
}

// ... classifyModel (unchanged) ...
function classifyModel(model) {
    const id = model.id.toLowerCase();
    const categories = [];
    const tags = [];

    // Classification par type de modèle
    if (id.includes("rag") || id.includes("retrieval") || id.includes("search")) {
        categories.push("RAG");
        tags.push("recherche", "bases de connaissances");
    }
    if (id.includes("moe") || id.includes("mixtral") || id.includes("mixtral")) {
        categories.push("MoE");
        tags.push("Mixture of Experts", "efficace");
    }
    if (id.includes("vision") || id.includes("visual") || id.includes("llava") || id.includes("qwen2-vl") || id.includes("yolo")) {
        categories.push("Vision");
        tags.push("analyse d'images", "multimodal");
    }
    if (id.includes("code") || id.includes("coder") || id.includes("codex") || id.includes("deepseek-coder")) {
        categories.push("Code");
        tags.push("programmation", "développement");
    }
    if (id.includes("math") || id.includes("math") || id.includes(" reasoning")) {
        categories.push("Math");
        tags.push("calcul", "raisonnement");
    }
    if (id.includes("instruct") || id.includes("chat") || !id.includes("pretrain")) {
        categories.push("Chat");
        tags.push("conversation", "instruction");
    }
    if (id.includes("embedding") || id.includes("embed")) {
        categories.push("Embedding");
        tags.push("vecteurs", "similarité");
    }

    // Classification par taille
    if (id.includes("7b") || id.includes("7B")) {
        tags.push("7B");
    } else if (id.includes("8b") || id.includes("8B") || id.includes("9b") || id.includes("9B")) {
        tags.push("8-9B");
    } else if (id.includes("70b") || id.includes("70B") || id.includes("72b") || id.includes("72B")) {
        tags.push("70B+");
    } else if (id.includes("405b") || id.includes("405B")) {
        tags.push("405B");
    }

    // Par contexte
    const ctx = model.context_length || 0;
    if (ctx >= 128000) tags.push("128K+");
    else if (ctx >= 32000) tags.push("32K");
    else if (ctx >= 16000) tags.push("16K");
    else if (ctx >= 8000) tags.push("8K");

    // Par architecture
    if (id.includes("llama")) tags.push("Llama");
    if (id.includes("qwen")) tags.push("Qwen");
    if (id.includes("mistral")) tags.push("Mistral");
    if (id.includes("gemma")) tags.push("Gemma");
    if (id.includes("phi")) tags.push("Phi");
    if (id.includes("deepseek")) tags.push("DeepSeek");
    if (id.includes("command")) tags.push("Command");

    return {
        categories: categories.length > 0 ? categories : ["General"],
        tags,
    };
}


/**
 * TESTE UN MODÈLE
 */
async function testModel(modelId) {
    const startTime = Date.now();
    const TIMEOUT = (state.config_overrides && state.config_overrides.request_timeout)
        ? state.config_overrides.request_timeout * 1000
        : config.MODEL_TEST_TIMEOUT_MS;

    try {
        const response = await axios.post(
            config.OPENROUTER_CHAT_URL,
            {
                model: modelId,
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 1,
            },
            {
                headers: authHeaders(),
                timeout: TIMEOUT,
            }
        );
        const latency = Date.now() - startTime;

        // Test supplémentaire pour évaluer la qualité
        let qualityScore = 50;
        try {
            const qualityTest = await axios.post(
                config.OPENROUTER_CHAT_URL,
                {
                    model: modelId,
                    messages: [{ role: "user", content: "What is 2+2? Answer with just the number." }],
                    max_tokens: 5,
                },
                {
                    headers: authHeaders(),
                    timeout: TIMEOUT,
                }
            );
            const responseText = qualityTest.data?.choices?.[0]?.message?.content?.toLowerCase() || "";
            if (responseText.includes("4")) qualityScore = 90;
            else if (responseText.length > 0) qualityScore = 70;
        } catch {
            qualityScore = 40;
        }

        return {
            success: true,
            latency,
            qualityScore,
            error: null,
        };
    } catch (err) {
        const latency = Date.now() - startTime;
        return {
            success: false,
            latency,
            qualityScore: 0,
            error: err.message,
        };
    }
}

/**
 * ÉTAPE 1 — Chargement rapide
 */
async function fetchFreeModels() {
    try {
        const { data } = await axios.get(config.OPENROUTER_MODELS_URL, {
            headers: authHeaders(),
            timeout: 15_000,
        });

        // Filtre les modèles gratuits
        const free = (data.data || []).filter((m) => {
            if (!m || !m.id) return false;
            return m.id.includes(":free") || parseFloat(m.pricing?.prompt ?? 0) === 0;
        });

        // Ajoute la classification à chaque modèle
        const classified = free.map((m) => ({
            ...m,
            ...classifyModel(m),
        }));

        // Tri par contexte décroissant
        classified.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));

        logger.info(`📋 ${free.length} modèles gratuits récupérés.`);
        return classified;
    } catch (err) {
        logger.error(`❌ fetchFreeModels: ${err.message}`);
        return [];
    }
}

/**
 * ÉTAPE 2 — Nettoyage et test en arrière-plan
 */
async function pruneDeadModels() {
    if (state.is_syncing) {
        logger.warn("🔄 Scan déjà en cours, annulé.");
        return;
    }
    if (state.active_models.length === 0) return;

    state.is_syncing = true;
    const modelsToTest = [...state.active_models];
    logger.info(`🔍 Test de ${modelsToTest.length} modèles en parallèle...`);

    const memory = loadModelMemory();

    try {
        const results = await Promise.all(
            modelsToTest.map(async (m) => {
                const result = await testModel(m.id);
                return { id: m.id, ...result };
            })
        );

        // Met à jour les modèles avec les résultats
        const validModels = [];

        for (let i = 0; i < modelsToTest.length; i++) {
            const model = modelsToTest[i];
            const result = results[i];

            // Sauvegarde les métriques en mémoire
            if (!memory.scores[model.id]) {
                memory.scores[model.id] = { tests: 0, totalScore: 0, totalLatency: 0 };
            }
            memory.scores[model.id].tests++;
            memory.scores[model.id].totalScore += result.qualityScore;
            memory.scores[model.id].totalLatency += result.latency;

            if (result.success) {
                // Calcule le score moyen
                const avgScore = memory.scores[model.id].totalScore / memory.scores[model.id].tests;
                const avgLatency = memory.scores[model.id].totalLatency / memory.scores[model.id].tests;

                validModels.push({
                    ...model,
                    lastTest: {
                        success: true,
                        latency: result.latency,
                        qualityScore: result.qualityScore,
                        avgScore: Math.round(avgScore),
                        avgLatency: Math.round(avgLatency),
                    }
                });
            }
        }

        const before = state.active_models.length;
        state.active_models = validModels;

        // Génère les recommandations
        generateRecommendations(memory);

        saveModelMemory(memory);
        state.last_sync = new Date().toLocaleTimeString("fr-FR");

        const removed = before - state.active_models.length;
        if (removed > 0) {
            logger.warn(`🗑️  ${removed} modèle(s) KO retirés. ${state.active_models.length} restants.`);
        } else {
            logger.info(`✅ Tous les modèles (${state.active_models.length}) sont OK.`);
        }
    } finally {
        state.is_syncing = false;
    }
}

// ... generateRecommendations (unchanged) ...
function generateRecommendations(memory) {
    const recommendations = [];
    const models = state.active_models;

    // Recommandation pour le meilleur généraliste
    const bestGeneral = models
        .filter(m => m.categories?.includes("Chat"))
        .sort((a, b) => (b.lastTest?.avgScore || 0) - (a.lastTest?.avgScore || 0))[0];

    if (bestGeneral) {
        recommendations.push({
            type: "general",
            model: bestGeneral.id,
            reason: "Meilleur score global pour le chat",
            score: bestGeneral.lastTest?.avgScore || 0,
        });
    }

    // Autres recommandations copiées depuis l'original ou inchangées
    // ... (Code existant inchangé pour la logique de recommandation, juste compacté ici pour lisibilité)
    // NOTE: Pour éviter de couper le fichier, je réutilise la logique existante.

    const fastest = models
        .filter(m => m.lastTest?.latency)
        .sort((a, b) => a.lastTest.latency - b.lastTest.latency)[0];

    if (fastest) {
        recommendations.push({
            type: "speed",
            model: fastest.id,
            reason: `Le plus rapide (${fastest.lastTest.latency}ms)`,
            score: fastest.lastTest?.avgScore || 0,
        });
    }

    const ragModel = models.find(m => m.categories?.includes("RAG"));
    if (ragModel) {
        recommendations.push({
            type: "rag",
            model: ragModel.id,
            reason: "Idéal pour les requêtes sur documents (RAG)",
            score: ragModel.lastTest?.avgScore || 0,
        });
    }

    const codeModel = models.find(m => m.categories?.includes("Code"));
    if (codeModel) {
        recommendations.push({
            type: "code",
            model: codeModel.id,
            reason: "Meilleur pour la programmation",
            score: codeModel.lastTest?.avgScore || 0,
        });
    }

    const visionModel = models.find(m => m.categories?.includes("Vision"));
    if (visionModel) {
        recommendations.push({
            type: "vision",
            model: visionModel.id,
            reason: "Supporte l'analyse d'images",
            score: visionModel.lastTest?.avgScore || 0,
        });
    }

    const moeModel = models.find(m => m.categories?.includes("MoE"));
    if (moeModel) {
        recommendations.push({
            type: "moe",
            model: moeModel.id,
            reason: "Architecture Mixture of Experts - efficace",
            score: moeModel.lastTest?.avgScore || 0,
        });
    }

    if (recommendations.length > 0) {
        memory.recommendations = recommendations;
        state.modelRecommendations = recommendations;
    }
}


/**
 * Lance le cycle complet : fetch + prune
 */
async function fullRefresh() {
    const fresh = await fetchFreeModels();
    if (fresh.length > 0) {
        state.active_models = fresh;
    }
    pruneDeadModels().catch(err => logger.error(err.message));
}

/**
 * Configure et démarre l'auto-refresh
 */
function restartAutoRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);

    const intervalMin = (state.config_overrides && state.config_overrides.refresh_interval)
        ? parseInt(state.config_overrides.refresh_interval)
        : 15;

    const intervalMs = intervalMin * 60 * 1000;

    refreshIntervalId = setInterval(fullRefresh, intervalMs);
    logger.info(`⏰ Auto-refresh configuré : toutes les ${intervalMin} min.`);
}

/**
 * Démarre la boucle de rafraîchissement au lancement
 */
async function startAutoRefresh() {
    const initial = await fetchFreeModels();
    state.active_models = initial;

    pruneDeadModels().catch(err => logger.error(err.message));

    restartAutoRefresh();
}

module.exports = {
    fetchFreeModels,
    pruneDeadModels,
    startAutoRefresh,
    restartAutoRefresh, // Exporté pour l'admin
    fullRefresh,
    classifyModel,
    loadModelMemory
};
