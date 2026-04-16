const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");
const auth = require("../middleware/authmiddleware");

// All chatbot routes require authentication
router.use(auth);

/**
 * POST /api/chatbot/query
 * Process user query and return AI response
 */
router.post("/query", chatbotController.processQuery);

/**
 * GET /api/chatbot/suggestions
 * Get predefined quick suggestions for UI
 */
router.get("/suggestions", chatbotController.getSuggestions);

/**
 * GET /api/chatbot/health
 * Health check for chatbot service
 */
router.get("/health", chatbotController.healthCheck);

module.exports = router;
