class ProviderStats {
  constructor(name) {
    this.name = name;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalTokensUsed = 0;
    this.lastError = null;
    this.lastErrorTime = null;
    this.consecutiveErrors = 0;
    this.lastRequestTime = null;
    this.isHealthy = true;
  }

  recordSuccess(tokensUsed = 0) {
    this.totalRequests++;
    this.successfulRequests++;
    this.totalTokensUsed += tokensUsed;
    this.consecutiveErrors = 0;
    this.lastRequestTime = new Date();
    this.isHealthy = true;
  }

  recordFailure(error) {
    this.totalRequests++;
    this.failedRequests++;
    this.lastError = error.message || error;
    this.lastErrorTime = new Date();
    this.consecutiveErrors++;
    this.lastRequestTime = new Date();
    
    // Mark as unhealthy if too many consecutive errors
    if (this.consecutiveErrors >= 3) {
      this.isHealthy = false;
    }
  }

  getSuccessRate() {
    if (this.totalRequests === 0) return 100;
    return (this.successfulRequests / this.totalRequests * 100).toFixed(2);
  }

  toString() {
    return {
      name: this.name,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: this.getSuccessRate() + '%',
      totalTokensUsed: this.totalTokensUsed,
      consecutiveErrors: this.consecutiveErrors,
      isHealthy: this.isHealthy,
      lastError: this.lastError,
      lastErrorTime: this.lastErrorTime,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

module.exports = ProviderStats;
