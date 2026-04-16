import React, { useState, useEffect } from 'react';
import api from '../services/apiClient';
import '../styles/apidiagnostics.css';

const APIdiagnostics = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const testEndpoint = async (endpoint, method = 'GET') => {
    const startTime = performance.now();
    try {
      let response;
      if (method === 'GET') {
        response = await api.get(endpoint);
      } else if (method === 'POST') {
        response = await api.post(endpoint, {});
      }
      const duration = performance.now() - startTime;
      
      return {
        status: 'success',
        duration: Math.round(duration),
        dataType: typeof response,
        isArray: Array.isArray(response),
        dataLength: Array.isArray(response) ? response.length : (typeof response === 'object' ? Object.keys(response).length : 'N/A'),
        sampleData: JSON.stringify(response).substring(0, 200),
        fullResponse: response
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        status: 'failed',
        duration: Math.round(duration),
        error: error.message,
        errorStatus: error?.response?.status,
        errorData: error?.response?.data
      };
    }
  };

  const runDiagnostics = async () => {
    const endpoints = [
      { url: '/products', method: 'GET' },
      { url: '/suppliers', method: 'GET' },
      { url: '/inventory', method: 'GET' },
      { url: '/analytics/overview', method: 'GET' },
      { url: '/sales', method: 'GET' },
      { url: '/purchase-orders', method: 'GET' },
      { url: '/payments', method: 'GET' },
      { url: '/chatbot/suggestions', method: 'GET' }
    ];

    const diagResults = {};
    for (const endpoint of endpoints) {
      diagResults[endpoint.url] = await testEndpoint(endpoint.url, endpoint.method);
    }

    setResults(diagResults);
    setLoading(false);
  };

  const handleRetry = async () => {
    setLoading(true);
    await runDiagnostics();
  };

  if (loading) {
    return <div className="diagnostic-container"><p>Running diagnostics...</p></div>;
  }

  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const failCount = Object.values(results).filter(r => r.status === 'failed').length;

  return (
    <div className="diagnostic-container">
      <h1>🔍 API Diagnostics</h1>
      
      <div className="summary">
        <div className="summary-card success-rate">
          <p>Success Rate: {successCount}/{Object.keys(results).length}</p>
        </div>
        <div className="summary-card">
          <p>✅ Success: {successCount}</p>
        </div>
        <div className="summary-card">
          <p>❌ Failed: {failCount}</p>
        </div>
      </div>

      <button className="retry-button" onClick={handleRetry}>🔄 Re-run Diagnostics</button>

      <div className="endpoints-list">
        {Object.entries(results).map(([endpoint, result]) => (
          <div key={endpoint} className={`endpoint-card ${result.status}`}>
            <div 
              className="endpoint-header"
              onClick={() => setExpandedEndpoint(expandedEndpoint === endpoint ? null : endpoint)}
            >
              <span className="endpoint-name">{endpoint}</span>
              <span className={`status-badge ${result.status}`}>
                {result.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}
              </span>
              <span className="duration">{result.duration}ms</span>
            </div>

            {expandedEndpoint === endpoint && (
              <div className="endpoint-details">
                {result.status === 'success' ? (
                  <>
                    <p><strong>Data Type:</strong> {result.dataType}</p>
                    <p><strong>Is Array:</strong> {result.isArray ? 'Yes' : 'No'}</p>
                    <p><strong>Items Count:</strong> {result.dataLength}</p>
                    <p><strong>Sample:</strong> <code>{result.sampleData}...</code></p>
                    <details>
                      <summary>View Full Response</summary>
                      <pre>{JSON.stringify(result.fullResponse, null, 2)}</pre>
                    </details>
                  </>
                ) : (
                  <>
                    <p><strong>Error:</strong> {result.error}</p>
                    {result.errorStatus && <p><strong>Status Code:</strong> {result.errorStatus}</p>}
                    {result.errorData && (
                      <details>
                        <summary>Error Details</summary>
                        <pre>{JSON.stringify(result.errorData, null, 2)}</pre>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="debug-info">
        <h3>Debug Information</h3>
        <p>API Base: <code>http://localhost:5000/api</code></p>
        <p>Auth Token: <code>{localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</code></p>
        <p>Cache Service: <code>Enabled</code></p>
        <button onClick={() => localStorage.removeItem('token')}>Clear Token</button>
        <button onClick={() => localStorage.clear()}>Clear All localStorage</button>
      </div>
    </div>
  );
};

export default APIdiagnostics;
