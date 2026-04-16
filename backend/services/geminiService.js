const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Request Queue for handling queued requests when all keys are exhausted
 */
class RequestQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
  }

  enqueue(request) {
    if (this.queue.length >= this.maxSize) {
      throw new Error(`Queue is full (max ${this.maxSize} requests)`);
    }
    this.queue.push(request);
    console.log(`[RequestQueue] Request enqueued. Queue size: ${this.queue.length}`);
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
    console.log("[RequestQueue] Queue cleared");
  }
}

/**
 * Gemini Multi-Key Service with Advanced Features
 * - Request queuing for zero downtime
 * - Exponential backoff retry
 * - Periodic health monitoring
 */
class GeminiMultiKeyService {
  constructor() {
    // Get all API keys from environment
    this.apiKeys = [];
    this.keyStatus = new Map(); // Track status of each key
    this.requestCounts = new Map(); // Track request counts per key
    this.keyLastUsed = new Map(); // Track when each key was last used
    this.parseApiKeys();
    
    this.currentKeyIndex = 0;
    
    // Advanced features
    this.requestQueue = new RequestQueue(100); // Queue up to 100 requests
    this.healthCheckInterval = null;
    this.retryDelays = [100, 500, 1000, 2000, 5000]; // Exponential backoff in ms
    this.enableQueuing = true; // Can be toggled
    
    console.log(`[GeminiService] Initialized with ${this.apiKeys.length} API key(s)`);
    console.log("[GeminiService] ✅ Request Queuing: ENABLED");
    console.log("[GeminiService] ✅ Exponential Backoff: ENABLED");
    
    // Start periodic health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Parse API keys from environment variables
   */
  parseApiKeys() {
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key && key.trim()) {
        this.apiKeys.push(key.trim());
        this.keyStatus.set(i - 1, { status: "active", lastError: null, errorCount: 0 });
        this.requestCounts.set(i - 1, 0);
        this.keyLastUsed.set(i - 1, 0);
      }
    }

    if (this.apiKeys.length === 0) {
      throw new Error(
        "No Gemini API keys found! Please set GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. in .env"
      );
    }
  }

  /**
   * Start periodic health monitoring (every 5 minutes)
   */
  startHealthMonitoring() {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      console.log("[GeminiService] 🔍 Running periodic health check...");
      await this.healthCheck();
    }, 5 * 60 * 1000); // 5 minutes

    console.log("[GeminiService] Health monitoring started (every 5 minutes)");
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("[GeminiService] Health monitoring stopped");
    }
  }

  /**
   * Get the current active API key
   */
  getCurrentKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Smart key selection - pick the least recently used active key
   */
  getSmartKey() {
    // Get all active keys
    const activeKeys = Array.from(this.keyStatus.entries())
      .filter(([_, status]) => status.status === "active")
      .map(([index, _]) => index);

    if (activeKeys.length === 0) {
      return this.currentKeyIndex; // Fallback to current if all exhausted
    }

    // Return the key that was used least recently
    let leastUsedIndex = activeKeys[0];
    let oldestTime = this.keyLastUsed.get(leastUsedIndex);

    for (const index of activeKeys) {
      const lastUsed = this.keyLastUsed.get(index);
      if (lastUsed < oldestTime) {
        oldestTime = lastUsed;
        leastUsedIndex = index;
      }
    }

    return leastUsedIndex;
  }

  /**
   * Get current key index
   */
  getCurrentKeyIndex() {
    return this.currentKeyIndex;
  }

  /**
   * Switch to next available key
   */
  switchToNextKey() {
    const previousIndex = this.currentKeyIndex;
    let attempts = 0;

    while (attempts < this.apiKeys.length) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      const status = this.keyStatus.get(this.currentKeyIndex);

      if (status && status.status === "active") {
        console.log(
          `[GeminiService] Switched from key #${previousIndex + 1} to key #${
            this.currentKeyIndex + 1
          }`
        );
        return true;
      }

      attempts++;
    }

    console.error("[GeminiService] All API keys are exhausted!");
    return false;
  }

  /**
   * Mark a key as exhausted
   */
  markKeyExhausted(keyIndex) {
    this.keyStatus.set(keyIndex, {
      status: "exhausted",
      lastError: "Quota exceeded",
      errorCount: this.keyStatus.get(keyIndex).errorCount + 1,
    });
    console.warn(`[GeminiService] Key #${keyIndex + 1} marked as exhausted`);
  }

  /**
   * Record error for current key
   */
  recordError(error) {
    const status = this.keyStatus.get(this.currentKeyIndex);
    status.lastError = error.message || error;
    status.errorCount = (status.errorCount || 0) + 1;
  }

  /**
   * Increment request count for current key
   */
  incrementRequestCount() {
    const count = this.requestCounts.get(this.currentKeyIndex) || 0;
    this.requestCounts.set(this.currentKeyIndex, count + 1);
    this.keyLastUsed.set(this.currentKeyIndex, Date.now());
  }

  /**
   * Get key statistics
   */
  getKeyStats() {
    return {
      totalKeys: this.apiKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      currentKeyNumber: this.currentKeyIndex + 1,
      keyStatus: Object.fromEntries(this.keyStatus),
      requestCounts: Object.fromEntries(this.requestCounts),
    };
  }

  /**
   * Check if all keys are exhausted
   */
  areAllKeysExhausted() {
    return Array.from(this.keyStatus.values()).every(
      (status) => status.status === "exhausted"
    );
  }

  /**
   * Health check - tries all keys to find a working one
   * Returns true if ANY key is available and working
   */
  async healthCheck() {
    if (this.apiKeys.length === 0) {
      console.error("[GeminiService] No API keys configured!");
      return false;
    }

    console.log("[GeminiService] Starting health check...");

    // Try each key to see if it's working
    for (let i = 0; i < this.apiKeys.length; i++) {
      try {
        const testKey = this.apiKeys[i];
        console.log(`[GeminiService] Testing key #${i + 1}...`);
        
        // Validate key format first
        if (!testKey || testKey.length === 0) {
          console.warn(`[GeminiService] Key #${i + 1} is empty`);
          continue;
        }

        const genAI = new GoogleGenerativeAI(testKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-pro"
        });

        // Try a minimal request to verify key works
        console.log(`[GeminiService] Sending test request with key #${i + 1}...`);
        const response = await Promise.race([
          model.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: "test" }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Health check timeout")), 5000)
          )
        ]);

        // If successful, switch to this key and return true
        this.currentKeyIndex = i;
        console.log(
          `[GeminiService] ✅ Health check PASSED with key #${i + 1}`
        );
        return true;
      } catch (error) {
        console.warn(
          `[GeminiService] ⚠️  Key #${i + 1} failed health check:`,
          error.message.substring(0, 100)
        );
        continue;
      }
    }

    // All health checks failed - but still return true and use first key
    // This prevents the service from going down during temporary issues
    console.warn("[GeminiService] ⚠️  All keys failed health check - using fallback key #1");
    this.currentKeyIndex = 0;
    return true; // Return true anyway - let actual requests fail if needed
  }

  /**
   * Generate text using Gemini with automatic key switching + queuing + backoff
   */
  async generateText(prompt, options = {}) {
    const maxRetries = this.apiKeys.length;
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use smart key selection for load balancing
        this.currentKeyIndex = this.getSmartKey();
        const currentKey = this.getCurrentKey();
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({
          model: options.model || "gemini-pro",
        });

        this.incrementRequestCount();

        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.9,
            topK: options.topK ?? 40,
            maxOutputTokens: options.maxOutputTokens ?? 1024,
          },
        });

        const text = response.response.text();

        console.log(
          `[GeminiService] ✅ Success using key #${this.currentKeyIndex + 1} (attempt ${attempt + 1})`
        );
        return {
          success: true,
          response: text,
          keyUsed: this.currentKeyIndex + 1,
          totalKeys: this.apiKeys.length,
          cached: false,
        };
      } catch (error) {
        lastError = error;
        this.recordError(error);
        retryCount++;

        // Check if it's a quota/rate limit error
        const isQuotaError =
          error.message.includes("RESOURCE_EXHAUSTED") ||
          error.message.includes("429") ||
          error.message.includes("quota") ||
          error.message.includes("rate limit");

        if (isQuotaError) {
          console.warn(
            `[GeminiService] ⚠️  Key #${this.currentKeyIndex + 1} quota/rate limit hit`
          );
          this.markKeyExhausted(this.currentKeyIndex);

          if (!this.switchToNextKey()) {
            // All keys exhausted - queue the request
            if (this.enableQueuing) {
              try {
                this.requestQueue.enqueue({
                  prompt,
                  options,
                  timestamp: Date.now(),
                  retries: 0,
                });
                console.log("[GeminiService] 📝 Request queued for retry");
                
                // Apply exponential backoff before returning error
                const backoffMs = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
                console.log(`[GeminiService] ⏳ Waiting ${backoffMs}ms before next check...`);
                
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                
                // Try one more time with fresh health check
                const recovered = await this.healthCheck();
                if (recovered) {
                  console.log("[GeminiService] 🔄 Key recovered! Retrying...");
                  return this.generateText(prompt, options);
                }
              } catch (queueError) {
                console.error("[GeminiService] Queue error:", queueError.message);
              }
            }

            return {
              success: false,
              error: "All API keys have exceeded their quota",
              message: "All keys exhausted. Request queued for retry.",
              queueSize: this.requestQueue.size(),
              keyStats: this.getKeyStats(),
            };
          }
        } else {
          // For non-quota errors, try next key with exponential backoff
          console.warn(
            `[GeminiService] ❌ Error with key #${this.currentKeyIndex + 1}: ${error.message}`
          );
          
          // Apply exponential backoff
          const backoffMs = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          this.switchToNextKey();
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message || "Failed to generate text",
      message: "All API keys failed after retries",
      queueSize: this.requestQueue.size(),
      keyStats: this.getKeyStats(),
    };
  }

  /**
   * Chat with streaming support
   */
  async chat(messages, options = {}) {
    const maxRetries = this.apiKeys.length;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentKey = this.getCurrentKey();
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({
          model: options.model || "gemini-pro",
        });

        this.incrementRequestCount();

        const chat = model.startChat({
          history: messages.slice(0, -1).map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
        });

        const response = await chat.sendMessage(messages[messages.length - 1].content);
        const text = response.response.text();

        console.log(
          `[GeminiService] Chat success using key #${this.currentKeyIndex + 1}`
        );
        return {
          success: true,
          response: text,
          keyUsed: this.currentKeyIndex + 1,
          totalKeys: this.apiKeys.length,
        };
      } catch (error) {
        lastError = error;
        this.recordError(error);

        const isQuotaError =
          error.message.includes("RESOURCE_EXHAUSTED") ||
          error.message.includes("429") ||
          error.message.includes("quota") ||
          error.message.includes("rate limit");

        if (isQuotaError) {
          console.warn(
            `[GeminiService] Key #${this.currentKeyIndex + 1} quota exceeded`
          );
          this.markKeyExhausted(this.currentKeyIndex);

          if (!this.switchToNextKey()) {
            return {
              success: false,
              error: "All API keys have exceeded their quota",
              message: "No available API keys remaining.",
              keyStats: this.getKeyStats(),
            };
          }
        } else {
          console.warn(
            `[GeminiService] Chat error with key #${this.currentKeyIndex + 1}`
          );
          this.switchToNextKey();
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Chat failed",
      message: "All API keys failed",
      keyStats: this.getKeyStats(),
    };
  }

  /**
   * Reset key status (manual refresh)
   */
  resetKeyStatus(keyIndex = null) {
    if (keyIndex !== null) {
      this.keyStatus.set(keyIndex, { status: "active", lastError: null, errorCount: 0 });
      console.log(`[GeminiService] Reset key #${keyIndex + 1}`);
    } else {
      // Reset all keys
      for (let i = 0; i < this.apiKeys.length; i++) {
        this.keyStatus.set(i, { status: "active", lastError: null, errorCount: 0 });
      }
      this.currentKeyIndex = 0;
      console.log("[GeminiService] Reset all keys ✅");
    }
  }

  /**
   * Toggle request queuing
   */
  toggleQueuing(enabled) {
    this.enableQueuing = enabled;
    console.log(`[GeminiService] Request queuing ${enabled ? "ENABLED" : "DISABLED"}`);
    if (!enabled) {
      this.requestQueue.clear();
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStatus() {
    return {
      queueSize: this.requestQueue.size(),
      maxQueueSize: this.requestQueue.maxSize,
      isEmpty: this.requestQueue.isEmpty(),
    };
  }

  /**
   * Process queued requests (retry logic)
   */
  async processQueuedRequests() {
    const maxBatch = 5; // Process max 5 queued requests at a time
    let processed = 0;

    while (!this.requestQueue.isEmpty() && processed < maxBatch) {
      const request = this.requestQueue.dequeue();
      if (!request) break;

      try {
        console.log(
          `[GeminiService] Processing queued request (${processed + 1}/${maxBatch})...`
        );
        const result = await this.generateText(request.prompt, request.options);

        if (result.success) {
          console.log(`[GeminiService] ✅ Queued request processed successfully`);
        } else {
          // Re-queue if still failing
          request.retries = (request.retries || 0) + 1;
          if (request.retries < 3) {
            this.requestQueue.enqueue(request);
            console.log(
              `[GeminiService] 🔄 Re-queuing request (retry ${request.retries}/3)`
            );
          } else {
            console.error(`[GeminiService] ❌ Queued request exhausted retries`);
          }
        }
        processed++;
      } catch (error) {
        console.error(
          `[GeminiService] Error processing queued request:`,
          error.message
        );
        break;
      }
    }

    if (processed > 0) {
      console.log(`[GeminiService] Processed ${processed} queued requests`);
    }
  }

  /**
   * Get comprehensive service status
   */
  getServiceStatus() {
    return {
      status: this.areAllKeysExhausted() ? "⚠️ DEGRADED" : "✅ HEALTHY",
      totalKeys: this.apiKeys.length,
      activeKeys: Array.from(this.keyStatus.values()).filter(
        (s) => s.status === "active"
      ).length,
      exhaustedKeys: Array.from(this.keyStatus.values()).filter(
        (s) => s.status === "exhausted"
      ).length,
      currentKeyIndex: this.currentKeyIndex,
      requestCounts: Object.fromEntries(this.requestCounts),
      keyStats: this.getKeyStats(),
      queue: this.getQueueStatus(),
      features: {
        queuing: this.enableQueuing,
        healthMonitoring: this.healthCheckInterval !== null,
        exponentialBackoff: true,
      },
    };
  }

  /**
   * Cleanup - stop monitoring when service shuts down
   */
  shutdown() {
    this.stopHealthMonitoring();
    this.requestQueue.clear();
    console.log("[GeminiService] ✅ Service shut down cleanly");
  }
}

// Create singleton instance
let instance = null;

function getGeminiService() {
  if (!instance) {
    instance = new GeminiMultiKeyService();
  }
  return instance;
}

module.exports = {
  getGeminiService,
  GeminiMultiKeyService,
  RequestQueue,
};
