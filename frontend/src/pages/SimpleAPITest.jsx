import React, { useState } from 'react';
import axios from 'axios';

const SimpleAPITest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testDirectAxios = async () => {
    setLoading(true);
    const testResults = {};

    // Test 1: Basic connectivity to backend
    try {
      const response = await axios.get('http://localhost:5000', { timeout: 5000 });
      testResults.backendConnectivity = {
        status: 'success',
        message: 'Backend server is reachable',
        response: response.status
      };
    } catch (error) {
      testResults.backendConnectivity = {
        status: 'failed',
        message: error.message,
        hint: 'Backend server is not running. Run: npm start in the backend folder'
      };
    }

    // Test 2: API endpoint without auth
    try {
      const response = await axios.get('http://localhost:5000/api', { timeout: 5000 });
      testResults.apiBase = {
        status: 'success',
        message: 'API base path is accessible',
        response: response.status
      };
    } catch (error) {
      testResults.apiBase = {
        status: 'failed',
        message: error.message,
        code: error.code,
        response: error.response?.status
      };
    }

    // Test 3: Products endpoint with auth
    const token = localStorage.getItem('token');
    if (!token) {
      testResults.authToken = {
        status: 'failed',
        message: 'No auth token found',
        hint: 'You need to be logged in'
      };
    } else {
      try {
        const response = await axios.get('http://localhost:5000/api/products', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000
        });
        testResults.productsAPI = {
          status: 'success',
          message: 'Products endpoint works',
          dataType: typeof response.data,
          sampleData: JSON.stringify(response.data).substring(0, 100)
        };
      } catch (error) {
        testResults.productsAPI = {
          status: 'failed',
          message: error.message,
          statusCode: error.response?.status,
          errorData: error.response?.data
        };
      }
    }

    // Test 4: CORS headers
    try {
      const response = await axios({
        method: 'options',
        url: 'http://localhost:5000/api/products',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        timeout: 5000
      });
      testResults.corsHeaders = {
        status: 'success',
        allowOrigin: response.headers['access-control-allow-origin'],
        allowMethods: response.headers['access-control-allow-methods']
      };
    } catch (error) {
      testResults.corsHeaders = {
        status: 'checked',
        message: 'CORS check complete',
        error: error.message
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh' }}>
      <h1>Simple API Connectivity Test</h1>
      <p>Direct Axios Test (bypasses caching system)</p>

      <button 
        onClick={testDirectAxios}
        style={{
          background: '#0e639c',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>

      <div style={{ marginTop: '20px' }}>
        {Object.entries(results).map(([test, result]) => (
          <div key={test} style={{
            background: '#252526',
            padding: '15px',
            marginBottom: '10px',
            borderLeft: `4px solid ${result.status === 'success' ? '#4ec9b0' : '#f44747'}`,
            borderRadius: '4px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
              {test}: {result.status === 'success' ? '✅' : '❌'} {result.status}
            </div>
            <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px', margin: '8px 0' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#3c3c3c',
        borderRadius: '4px'
      }}>
        <h3>Troubleshooting Steps:</h3>
        <ol>
          <li><strong>Backend Connectivity fails?</strong> → Start backend: <code>cd backend && npm start</code></li>
          <li><strong>API Base fails?</strong> → Check backend logs for error messages</li>
          <li><strong>Auth Token fails?</strong> → Login first at the login page</li>
          <li><strong>Products API fails?</strong> → Check backend logs and API status code</li>
          <li><strong>CORS fails?</strong> → Backend CORS might be misconfigured</li>
        </ol>

        <h3>Backend Logs to Check:</h3>
        <p>When you run <code>npm start</code> in backend, look for:</p>
        <ul>
          <li>✅ "Server running on port 5000"</li>
          <li>✅ "MongoDB connected"</li>
          <li>✅ "Email service initialized"</li>
          <li>❌ Any error messages in red</li>
          <li>❌ "Cannot find module" errors</li>
          <li>❌ "Port 5000 already in use"</li>
        </ul>

        <h3>Next Steps:</h3>
        <ol>
          <li>Run the tests above</li>
          <li>Note which tests pass/fail</li>
          <li>If Backend Connectivity fails → Check if backend is running</li>
          <li>If API works → Problem is with caching layer, not backend</li>
          <li>Share the test results for more specific help</li>
        </ol>
      </div>
    </div>
  );
};

export default SimpleAPITest;
