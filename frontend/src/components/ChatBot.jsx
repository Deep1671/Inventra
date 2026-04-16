import React, { useState, useEffect, useRef } from "react";
import api from "../services/apiClient";
import ChatMessage from "./ChatMessage";
import SuggestionButtons from "./SuggestionButtons";
import "../styles/chatbot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]); // Initialize as empty array instead of null
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load suggestions on component mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /**
   * Load predefined suggestions from backend
   */
  const loadSuggestions = async () => {
    try {
      const response = await api.get("/chatbot/suggestions");
      // Handle different response structures safely
      const data = response?.data || response || {};
      const suggestionsList = data.suggestions || data || [];
      
      if (Array.isArray(suggestionsList) && suggestionsList.length > 0) {
        setSuggestions(suggestionsList);
        console.log("✅ Chatbot suggestions loaded:", suggestionsList);
      } else {
        console.warn("⚠️ No suggestions available from server");
        setSuggestions([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error("❌ Error loading suggestions:", error);
      setSuggestions([]); // Set empty array on error to prevent rendering issues
    }
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (message = null) => {
    const queryMessage = message || inputValue.trim();

    if (!queryMessage) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: queryMessage,
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Send to backend chatbot API
      const response = await api.post("/chatbot/query", {
        message: queryMessage,
      });

      const data = response.data;

      // Add bot response to chat
      const botMessage = {
        id: Date.now() + 1,
        role: "bot",
        content: data.response,
        type: data.type || "text",
        data: data.data || null,
        intent: data.intent || null,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: "bot",
        content: error.response?.data?.message ||
                 "Sorry, I encountered an error. Please try again.",
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Clear chat history
   */
  const clearChat = () => {
    setMessages([]);
  };

  /**
   * Toggle chat window open/close
   */
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className="chatbot-toggle-btn"
        title="Open Chat Assistant"
        aria-label="Open Chat Assistant"
      >
        {isOpen ? (
          <span className="chatbot-icon">✕</span>
        ) : (
          <span className="chatbot-icon">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <h3>📊 Inventi</h3>
            <div className="chatbot-header-actions">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="chatbot-clear-btn"     
                  title="Clear chat"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={toggleChat}
                className="chatbot-close-btn"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="chatbot-messages">
            {messages.length === 0 ? (
              <div className="chatbot-welcome">
                <h4>Hello! 👋</h4>
                <p>I'm your inventory analytics assistant. Ask me about:</p>
                <ul>
                  <li>📈 Sales trends and top products</li>
                  <li>📦 Inventory levels and alerts</li>
                  <li>🤝 Supplier performance</li>
                </ul>
                <p>Or click suggestions below to get started.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))
            )}

            {isLoading && (
              <div className="chatbot-loading">
                <span className="loading-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions - Show when no messages or first message */}
          {messages.length === 0 && suggestions && (
            <SuggestionButtons
              suggestions={suggestions}
              onSelectSuggestion={handleSendMessage}
            />
          )}

          {/* Input Box */}
          <div className="chatbot-input-container">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about sales, inventory, or suppliers..."
              className="chatbot-input"
              rows="2"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="chatbot-send-btn"
              title="Send message"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
