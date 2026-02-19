/**
 * routes/index.js
 * ─────────────────────────────────────────────────────────
 * Définit toutes les routes de l'application Express.
 */
const { Router } = require("express");
const dashboardController = require("../controllers/dashboardController");
const chatController = require("../controllers/chatController");
const adminController = require("../controllers/adminController");

const router = Router();

// ── Auth ───────────────────────────────────────────────
router.get("/login", (req, res) => res.render("login", { error: req.query.error === "1" }));
router.post("/login", adminController.loginDashboard);
router.get("/logout", adminController.logoutDashboard);

// ── Dashboard ──────────────────────────────────────────
router.get("/", dashboardController.showDashboard);

// ── Chat (compatible API OpenAI) ───────────────────────
router.post("/chat", chatController.handleChat);
router.post("/v1/chat/completions", chatController.handleChat);

// ── Admin ──────────────────────────────────────────────
router.post("/config", adminController.updateConfig);
router.post("/refresh", adminController.refreshModels);
router.get("/health", adminController.healthCheck);
router.get("/v1/models", adminController.listModels);

module.exports = router;
