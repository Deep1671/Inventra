/**
 * Performance Monitoring Service
 * Tracks API performance, cache effectiveness, and system metrics
 */

class PerformanceService {
  constructor() {
    this.metrics = {
      apiCalls: [],
      pageLoadTimes: [],
      renderTimes: [],
      cacheStats: null,
      memoryUsage: []
    };

    this.thresholds = {
      apiWarning: 1000, // 1 second
      apiCritical: 3000, // 3 seconds
      pageLoadWarning: 3000, // 3 seconds
      renderWarning: 16 // 16ms (60fps)
    };

    this.observers = {
      navigation: null,
      performance: null
    };
  }

  /**
   * Track API request performance
   */
  trackAPICall(endpoint, method, duration, success = true, cacheHit = false) {
    const metric = {
      endpoint,
      method,
      duration,
      success,
      cacheHit,
      timestamp: Date.now(),
      status: this.getPerformanceStatus(duration, 'api')
    };

    this.metrics.apiCalls.push(metric);

    // Keep only last 100 calls
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }

    if (!success) {
      console.warn(`[Performance] FAILED: ${method} ${endpoint} (${duration}ms)`);
    } else if (duration > this.thresholds.apiCritical) {
      console.warn(`[Performance] SLOW: ${method} ${endpoint} (${duration}ms)`);
    } else if (cacheHit) {
      console.log(`[Performance] CACHED HIT: ${method} ${endpoint} (${duration}ms)`);
    }

    return metric;
  }

  /**
   * Get performance status based on duration
   */
  getPerformanceStatus(duration, type = 'api') {
    const threshold = this.thresholds[`${type}Warning`];
    const critical = this.thresholds[`${type}Critical`];

    if (duration >= critical) return 'critical';
    if (duration >= threshold) return 'warning';
    return 'good';
  }

  /**
   * Calculate API statistics
   */
  getAPIStats() {
    if (this.metrics.apiCalls.length === 0) {
      return {
        totalCalls: 0,
        avgResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0,
        slowRequests: 0,
        failedRequests: 0
      };
    }

    const calls = this.metrics.apiCalls;
    const successCalls = calls.filter(c => c.success);
    const cachedCalls = calls.filter(c => c.cacheHit);
    const slowCalls = calls.filter(c => c.status === 'warning' || c.status === 'critical');
    const failedCalls = calls.filter(c => !c.success);

    const avgTime = successCalls.length > 0
      ? successCalls.reduce((sum, c) => sum + c.duration, 0) / successCalls.length
      : 0;

    return {
      totalCalls: calls.length,
      successfulCalls: successCalls.length,
      avgResponseTime: avgTime.toFixed(2),
      successRate: ((successCalls.length / calls.length) * 100).toFixed(2),
      cacheHitRate: ((cachedCalls.length / calls.length) * 100).toFixed(2),
      slowRequests: slowCalls.length,
      failedRequests: failedCalls.length,
      p95ResponseTime: this.calculatePercentile(calls.map(c => c.duration), 95),
      p99ResponseTime: this.calculatePercentile(calls.map(c => c.duration), 99)
    };
  }

  /**
   * Calculate percentile of array values
   */
  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Track page load performance
   */
  trackPageLoad(pageName, duration) {
    const metric = {
      page: pageName,
      duration,
      timestamp: Date.now(),
      status: this.getPerformanceStatus(duration, 'pageLoad')
    };

    this.metrics.pageLoadTimes.push(metric);

    if (this.metrics.pageLoadTimes.length > 50) {
      this.metrics.pageLoadTimes.shift();
    }

    console.log(`[Performance] Page load: ${pageName} (${duration}ms)`);
    return metric;
  }

  /**
   * Track React component render time
   */
  trackRender(componentName, duration) {
    const metric = {
      component: componentName,
      duration,
      timestamp: Date.now(),
      status: duration > this.thresholds.renderWarning ? 'warning' : 'good'
    };

    this.metrics.renderTimes.push(metric);

    if (this.metrics.renderTimes.length > 100) {
      this.metrics.renderTimes.shift();
    }

    if (metric.status === 'warning') {
      console.warn(`[Performance] Slow render: ${componentName} (${duration}ms)`);
    }

    return metric;
  }

  /**
   * Get render statistics
   */
  getRenderStats() {
    if (this.metrics.renderTimes.length === 0) {
      return { avgRenderTime: 0, slowRenders: 0 };
    }

    const renders = this.metrics.renderTimes;
    const avgTime = renders.reduce((sum, r) => sum + r.duration, 0) / renders.length;
    const slowRenders = renders.filter(r => r.status === 'warning').length;

    return {
      totalRenders: renders.length,
      avgRenderTime: avgTime.toFixed(2),
      slowRenders,
      fps: (1000 / avgTime).toFixed(1)
    };
  }

  /**
   * Get estimated memory usage
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
      };
    }
    return null;
  }

  /**
   * Get comprehensive performance report
   */
  getFullReport() {
    return {
      apiStats: this.getAPIStats(),
      renderStats: this.getRenderStats(),
      memory: this.getMemoryUsage(),
      slowestRequests: this.metrics.apiCalls
        .filter(c => c.success)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5),
      slowestPages: this.metrics.pageLoadTimes
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      apiCalls: [],
      pageLoadTimes: [],
      renderTimes: [],
      cacheStats: null,
      memoryUsage: []
    };
    console.log('[Performance] Metrics reset');
  }
}

export default new PerformanceService();
