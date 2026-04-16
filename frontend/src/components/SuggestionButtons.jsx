import React, { useState } from "react";

const SuggestionButtons = ({ suggestions, onSelectSuggestion }) => {
  const [activeCategory, setActiveCategory] = useState("sales");

  if (!suggestions) return null;

  const categories = Object.keys(suggestions);
  const currentSuggestions = suggestions[activeCategory] || [];

  return (
    <div className="suggestion-buttons-container">
      {/* Category Tabs */}
      <div className="suggestion-tabs">
        {categories.map((category) => (
          <button
            key={category}
            className={`suggestion-tab ${activeCategory === category ? "active" : ""}`}
            onClick={() => setActiveCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Suggestion Buttons */}
      <div className="suggestion-buttons">
        {currentSuggestions.map((suggestion, idx) => (
          <button
            key={idx}
            className="suggestion-btn"
            onClick={() => onSelectSuggestion(suggestion.query)}
            title={suggestion.query}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionButtons;
