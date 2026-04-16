const axios = require("axios");

/**
 * Request Queue for handling queued requests
 */
class RequestQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(request) {
    if (this.queue.length >= this.maxSize) {
      throw new Error(`Queue is full (max ${this.maxSize} requests)`);
    }
    this.queue.push(request);
    console.log(`[OpenRouterService] Request queued. Queue size: ${this.queue.length}`);
    return true;
  }

  dequeue() {
    return this.queue.shift();
  }

  size() {
    return this.queue.length;
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [];
    console.log("[OpenRouterService] Queue cleared");
  }
}

/**
 * OpenRouter Service - Using Free Google Gemma 4 31B Model
 * - Single reliable API provider
 * - Request queuing for smooth experience
 * - Exponential backoff retry logic
 */
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.model = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
    this.baseUrl = "https://openrouter.ai/api/v1";
    
    this.requestQueue = new RequestQueue(100);
    this.retryDelays = [100, 500, 1000, 2000, 5000];
    
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastError = null;
    this.isHealthy = true;
    this.healthCheckInterval = null;
    
    this.enableQueuing = true;

    if (!this.apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY not found in .env. Please add your API key from https://openrouter.ai/keys"
      );
    }

    console.log(`[OpenRouterService] Initialized`);
    console.log(`[OpenRouterService] Model: ${this.model}`);
    console.log("[OpenRouterService] ✅ Request Queuing: ENABLED");
    console.log("[OpenRouterService] ✅ Exponential Backoff: ENABLED");
    
    this.startHealthMonitoring();
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      console.log("[OpenRouterService] 🔍 Running periodic health check...");
      await this.healthCheck();
    }, 5 * 60 * 1000); // 5 minutes

    console.log("[OpenRouterService] Health monitoring started (every 5 minutes)");
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("[OpenRouterService] Health monitoring stopped");
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck() {
    try {
      console.log("[OpenRouterService] Testing API connectivity...");
      console.log(`[OpenRouterService] Using API Key: ${this.apiKey.substring(0, 20)}...`);
      console.log(`[OpenRouterService] Using Model: ${this.model}`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: "user",
              content: "test"
            }
          ],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Smart Inventory Management"
          },
          timeout: 5000
        }
      );

      this.isHealthy = true;
      console.log("[OpenRouterService] ✅ Health check PASSED");
      return true;
    } catch (error) {
      this.isHealthy = false;
      this.lastError = error.message;
      console.warn("[OpenRouterService] ⚠️ Health check FAILED:", error.message);
      if (error.response?.status) {
        console.warn(`[OpenRouterService] Status Code: ${error.response.status}`);
        console.warn(`[OpenRouterService] Response: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  /**
   * Generate text using OpenRouter
   */
  async generateText(prompt, options = {}) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[OpenRouterService] Generating text (attempt ${attempt + 1}/${maxRetries})...`);
        
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 0.9,
            max_tokens: options.maxOutputTokens ?? 1024,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "Smart Inventory Management"
            },
            timeout: 30000 // 30 second timeout
          }
        );

        const text = response.data.choices[0]?.message?.content || "";
        this.requestCount++;

        console.log(`[OpenRouterService] ✅ Text generated successfully`);
        return {
          success: true,
          response: text.trim(),
          cached: false,
          model: this.model,
          requestCount: this.requestCount
        };
      } catch (error) {
        lastError = error;
        this.errorCount++;
        this.lastError = error.message;

        // Check if it's a rate limit error
        const isRateLimit = 
          error.response?.status === 429 ||
          error.message.includes("rate limit") ||
          error.message.includes("Too many requests");

        if (isRateLimit) {
          console.warn("[OpenRouterService] ⚠️ Rate limited. Queuing request...");
          
          if (this.enableQueuing) {
            try {
              this.requestQueue.enqueue({ prompt, options, timestamp: Date.now() });
              return {
                success: false,
                error: "Rate limited - request queued",
                message: "Your request has been queued and will be processed when limits reset",
                queueSize: this.requestQueue.size(),
                retryAfter: 60 // seconds
              };
            } catch (queueError) {
              console.error("[OpenRouterService] Queue error:", queueError.message);
            }
          }
        }

        // Apply exponential backoff for retries
        if (attempt < maxRetries - 1) {
          const backoffMs = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
          console.log(`[OpenRouterService] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Failed to generate text",
      message: "All retry attempts failed",
      queueSize: this.requestQueue.size()
    };
  }

  /**
   * Chat endpoint
   */
  async chat(messages, options = {}) {
    try {
      console.log("[OpenRouterService] Starting chat...");
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role || "user",
            content: msg.content || msg.text || msg.message || ""
          })),
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          max_tokens: options.maxOutputTokens ?? 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Smart Inventory Management"
          },
          timeout: 30000
        }
      );

      const text = response.data.choices[0]?.message?.content || "";
      this.requestCount++;
      
      console.log("[OpenRouterService] ✅ Chat response generated");
      return {
        success: true,
        response: text.trim(),
        model: this.model
      };
    } catch (error) {
      this.errorCount++;
      this.lastError = error.message;
      console.error("[OpenRouterService] ❌ Chat error:", error.message);
      
      return {
        success: false,
        error: error.message,
        message: "Failed to generate chat response"
      };
    }
  }

  /**
   * Process queued requests
   */
  async processQueuedRequests() {
    const maxBatch = 5;
    let processed = 0;

    while (!this.requestQueue.isEmpty() && processed < maxBatch) {
      const request = this.requestQueue.dequeue();
      if (!request) break;

      try {
        console.log(`[OpenRouterService] Processing queued request (${processed + 1}/${maxBatch})...`);
        const result = await this.generateText(request.prompt, request.options);

        if (result.success) {
          console.log("[OpenRouterService] ✅ Queued request processed");
        } else {
          console.warn("[OpenRouterService] Queued request failed, discarding");
        }
        processed++;
      } catch (error) {
        console.error("[OpenRouterService] Error processing queue:", error.message);
        break;
      }
    }

    if (processed > 0) {
      console.log(`[OpenRouterService] Processed ${processed} queued requests`);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      status: this.isHealthy ? "✅ HEALTHY" : "⚠️ DEGRADED",
      model: this.model,
      provider: "OpenRouter (Free)",
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      queue: {
        size: this.requestQueue.size(),
        maxSize: this.requestQueue.maxSize
      },
      features: {
        queuing: this.enableQueuing,
        healthMonitoring: this.healthCheckInterval !== null,
        exponentialBackoff: true
      }
    };
  }

  /**
   * Get service status - alias for getStatus() for compatibility
   */
  getServiceStatus() {
    return this.getStatus();
  }

  /**
   * Get queue status information
   */
  getQueueStatus() {
    return {
      queueSize: this.requestQueue.size(),
      maxQueueSize: this.requestQueue.maxSize,
      isEmpty: this.requestQueue.isEmpty(),
      isFull: this.requestQueue.size() >= this.requestQueue.maxSize
    };
  }

  /**
   * Get key stats (compatibility method - single key service)
   */
  getKeyStats() {
    return {
      totalKeys: 1,
      activeKeys: 1,
      serviceStatus: this.isHealthy ? "healthy" : "degraded",
      provider: "OpenRouter",
      model: this.model,
      requestCount: this.requestCount,
      errorCount: this.errorCount
    };
  }

  /**
   * Check if all keys are exhausted (compatibility method - always false for single key)
   */
  areAllKeysExhausted() {
    return false; // Single API key service doesn't exhaust like multi-key Gemini
  }

  /**
   * Toggle features
   */
  toggleQueuing(enabled) {
    this.enableQueuing = enabled;
    console.log(`[OpenRouterService] Request queuing ${enabled ? "ENABLED" : "DISABLED"}`);
    if (!enabled) {
      this.requestQueue.clear();
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    this.stopHealthMonitoring();
    this.requestQueue.clear();
    console.log("[OpenRouterService] ✅ Service shut down cleanly");
  }
}

// Create singleton instance
let instance = null;

function getOpenRouterService() {
  if (!instance) {
    instance = new OpenRouterService();
  }
  return instance;
}

module.exports = {
  getOpenRouterService,
  OpenRouterService,
  RequestQueue,
};
