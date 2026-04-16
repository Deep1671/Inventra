import axios from 'axios';
import performanceService from './performanceService';

/**
 * API Service - Centralized request handler with deduplication and stats
 */
class APIService {
  constructor() {
    this.API_BASE = 'http://localhost:5000/api';
    this.pendingRequests = new Map();
    this.requestStats = {
      total: 0,
      fromNetwork: 0,
      deduplicated: 0
    };
  }

  getAuthToken() {
    return localStorage.getItem('token') || '';
  }

  async request(method, endpoint, options = {}) {
    const { data = null, params = {} } = options;
    this.requestStats.total++;
    const startTime = performance.now();
    
    const key = method + ':' + endpoint + ':' + JSON.stringify(params);

    const requestPromise = this._makeRequest(method, endpoint, data, params)
      .then(response => {
        const duration = performance.now() - startTime;
        this.requestStats.fromNetwork++;
        performanceService.trackAPICall(endpoint, method, duration, true, false);
        this.pendingRequests.delete(key);
        return response;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        performanceService.trackAPICall(endpoint, method, duration, false, false);
        this.pendingRequests.delete(key);
        throw error;
      });

    if (this.pendingRequests.has(key)) {
      console.log('[API] DEDUPLICATED: ' + endpoint);
      this.requestStats.deduplicated++;
      return this.pendingRequests.get(key);
    }
    
    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  async _makeRequest(method, endpoint, data, params) {
    try {
      const url = this.API_BASE + endpoint;
      const config = {
        method,
        url,
        headers: {
          'Authorization': 'Bearer ' + this.getAuthToken(),
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      console.log('[API] SUCCESS: ' + method + ' ' + endpoint);
      return response.data;
    } catch (error) {
      console.error('[API] ERROR: ' + method + ' ' + endpoint, error.message);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, Object.assign({}, options, { data }));
  }

  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, Object.assign({}, options, { data }));
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  getStats() {
    return {
      total: this.requestStats.total,
      fromNetwork: this.requestStats.fromNetwork,
      deduplicated: this.requestStats.deduplicated,
      pendingRequests: this.pendingRequests.size
    };
  }
}

const apiService = new APIService();

export default apiService;
