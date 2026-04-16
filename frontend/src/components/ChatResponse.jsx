import React from "react";

const ChatResponse = ({ type, content, data }) => {
  /**
   * Render table response
   */
  const renderTable = () => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No data available</p>;
    }

    // Get column headers from first object
    const headers = Object.keys(data[0]).slice(0, 4); // Limit to 4 columns for compact display
    const rows = data; // Show ALL rows

    return (
      <div className="response-table-container">
        <table className="response-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {headers.map((header) => (
                  <td key={header}>
                    {typeof row[header] === "number"
                      ? row[header].toFixed(2)
                      : String(row[header]).substring(0, 30)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="table-info">
          Total: {data.length} items
        </p>
      </div>
    );
  };

  /**
   * Render chart response (mini summary chart)
   */
  const renderChart = () => {
    if (!data || typeof data !== "object") {
      return <p className="no-data">No chart data available</p>;
    }

    // Simple bar chart visualization
    const entries = Object.entries(data).slice(0, 5);
    const maxValue = Math.max(...entries.map((e) => {
      const val = typeof e[1] === "number" ? e[1] : 0;
      return val;
    }));

    return (
      <div className="response-chart-container">
        <div className="mini-bar-chart">
          {entries.map(([label, value]) => {
            const percentage = ((value / maxValue) * 100) || 0;
            return (
              <div key={label} className="chart-bar-item">
                <label className="chart-label">{String(label).substring(0, 15)}</label>
                <div className="chart-bar">
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="chart-value">
                  {typeof value === "number" ? value.toFixed(1) : value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * Render text response
   */
  const renderText = () => {
    return <p className="message-text">{content}</p>;
  };

  // Render based on type
  switch (type) {
    case "table":
      return (
        <div className="response-container">
          {content && <p className="response-summary">{content}</p>}
          {renderTable()}
        </div>
      );
    case "chart":
      return (
        <div className="response-container">
          {content && <p className="response-summary">{content}</p>}
          {renderChart()}
        </div>
      );
    case "text":
    default:
      return renderText();
  }
};

export default ChatResponse;
