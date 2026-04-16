/**
 * API Response Viewer Component
 * Displays saved API responses for debugging and monitoring
 * Can be accessed via browser console or integrated into a debug panel
 */

import React, { useState, useEffect } from 'react';
import useApiResponseStorage from '../hooks/useApiResponseStorage';

export const ApiResponseViewer = () => {
  const { responses, stats, refreshResponses, exportResponses, clearResponses } = useApiResponseStorage();
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    refreshResponses(50);
  }, []);

  if (!showViewer) {
    return (
      <button
        onClick={() => setShowViewer(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        title="View saved API responses"
      >
        🔍 API Responses ({responses.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border-2 border-blue-600 rounded-lg shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex justify-between items-center rounded-t-lg">
        <h3 className="font-bold">API Response Storage</h3>
        <button
          onClick={() => setShowViewer(false)}
          className="text-white hover:bg-blue-700 px-2 py-1 rounded"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-gray-100 p-2 text-xs border-b">
          <div className="grid grid-cols-2 gap-2">
            <div>Total: {stats.totalResponses}</div>
            <div>Size: {stats.estimatedSize}</div>
          </div>
        </div>
      )}

      {/* Response List */}
      <div className="flex-1 overflow-y-auto p-3 bg-white">
        {responses.length === 0 ? (
          <div className="text-gray-500 text-sm">No saved responses yet</div>
        ) : (
          <div className="space-y-2">
            {responses.map((response, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedResponse(response)}
                className="p-2 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100 text-xs"
              >
                <div className="font-semibold text-gray-800">{response.method} {response.endpoint}</div>
                <div className="text-gray-600">
                  {new Date(response.timestamp).toLocaleTimeString()} • {response.duration}ms • {response.size}B
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Response Detail */}
      {selectedResponse && (
        <div className="bg-gray-50 border-t p-3 max-h-32 overflow-y-auto text-xs">
          <div className="font-semibold mb-2">Selected Response:</div>
          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto max-h-24">
            {JSON.stringify(selectedResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="bg-gray-100 p-2 flex gap-2 rounded-b-lg border-t">
        <button
          onClick={exportResponses}
          className="flex-1 bg-green-600 text-white py-1 rounded text-xs hover:bg-green-700"
        >
          📥 Export
        </button>
        <button
          onClick={() => {
            refreshResponses(50);
          }}
          className="flex-1 bg-blue-600 text-white py-1 rounded text-xs hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
        <button
          onClick={clearResponses}
          className="flex-1 bg-red-600 text-white py-1 rounded text-xs hover:bg-red-700"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
};

export default ApiResponseViewer;
