const chatbotService = require("../services/chatbotService");

/**
 * POST /api/chatbot/query
 * Process user query and return AI response
 */
exports.processQuery = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message cannot be empty",
      });
    }

    // Validate message length
    if (message.length > 500) {
      return res.status(400).json({
        error: "Message is too long (max 500 characters)",
      });
    }

    console.log(`[Chatbot] Processing query from user ${userId}: "${message}"`);

    // Process the query using chatbot service
    const result = await chatbotService.processUserQuery(message, userId);

    return res.status(200).json({
      success: true,
      response: result.response,
      type: result.type,
      data: result.data,
      intent: result.intent,
    });
  } catch (error) {
    console.error("[Chatbot] Error processing query:", error);
    return res.status(500).json({
      error: "Failed to process query",
      message: error.message,
    });
  }
};

/**
 * GET /api/chatbot/suggestions
 * Get predefined quick suggestions for UI
 */
exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = chatbotService.getQuickSuggestions();

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("[Chatbot] Error fetching suggestions:", error);
    return res.status(500).json({
      error: "Failed to fetch suggestions",
      message: error.message,
    });
  }
};

/**
 * GET /api/chatbot/health
 * Health check endpoint
 */
exports.healthCheck = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Chatbot service is running",
      geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Chatbot service is unavailable",
      message: error.message,
    });
  }
};
