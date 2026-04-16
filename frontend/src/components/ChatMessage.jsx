import React from "react";
import ChatResponse from "./ChatResponse";

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`chatbot-message ${message.role}`}>
      <div className={`message-content ${message.role}`}>
        {message.type === "text" && (
          <p className="message-text">{message.content}</p>
        )}

        {message.type === "table" && (
          <ChatResponse type="table" content={message.content} data={message.data} />
        )}

        {message.type === "chart" && (
          <ChatResponse type="chart" content={message.content} data={message.data} />
        )}

        {!isUser && (
          <div className="message-meta">
            {message.intent && (
              <span className="intent-badge">{message.intent}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
