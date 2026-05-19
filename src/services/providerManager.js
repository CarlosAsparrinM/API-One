const logger = require('../utils/logger');
const GeminiProvider = require('./providers/geminiProvider');
const GroqProvider = require('./providers/groqProvider');
const ProviderStats = require('../models/ProviderStats');
const { resolveModelForProvider } = require('../config/modelCatalog');

class ProviderManager {
  constructor() {
    this.providers = [];
    this.providerStats = new Map();
    this.providerPriority = (process.env.AI_PROVIDER_PRIORITY || 'groq,gemini')
      .split(',')
      .map(p => p.trim());
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalFallbacks: 0,
      totalLatencyMs: 0,
      lastRequestAt: null,
    };
  }

  initializeProviders() {
    logger.info('Initializing AI providers...');

    if (process.env.GROQ_ENABLED !== 'false') {
      const groq = new GroqProvider();
      if (groq.isConfigured()) {
        this.providers.push(groq);
        this.providerStats.set('groq', new ProviderStats('groq'));
        logger.info('✓ Groq provider initialized (FREE)');
      }
    }

    if (process.env.GEMINI_ENABLED !== 'false') {
      const gemini = new GeminiProvider();
      if (gemini.isConfigured()) {
        this.providers.push(gemini);
        this.providerStats.set('gemini', new ProviderStats('gemini'));
        logger.info('✓ Gemini provider initialized (FREE tier available)');
      }
    }

    if (this.providers.length === 0) {
      logger.warn('⚠️  No AI providers were configured. Please check your .env file.');
    } else {
      logger.info(`✓ Total providers available: ${this.providers.length}`);
    }
  }

  getSortedProviders() {
    return this.providers.sort((a, b) => {
      const priorityA = this.providerPriority.indexOf(a.name);
      const priorityB = this.providerPriority.indexOf(b.name);
      return priorityA - priorityB;
    });
  }

  getHealthyProviders() {
    return this.getSortedProviders().filter(p => {
      const stats = this.providerStats.get(p.name);
      return stats && stats.isHealthy;
    });
  }

  async executeWithFallback(type, params) {
    const requestStart = Date.now();
    this.metrics.totalRequests += 1;
    this.metrics.lastRequestAt = new Date();

    const healthyProviders = this.getHealthyProviders();

    if (healthyProviders.length === 0) {
      const unavailableError = new Error('No healthy AI providers available');
      unavailableError.status = 503;
      throw unavailableError;
    }

    let lastError = null;
    const fallbackTrace = [];

    for (const provider of healthyProviders) {
      const providerModel = resolveModelForProvider(params.model, provider.name, type);
      if (providerModel === null) {
        fallbackTrace.push({
          provider: provider.name,
          status: 'skipped',
          reason: `Requested model "${params.model}" targets another provider.`,
        });
        continue;
      }

      const providerStart = Date.now();
      try {
        logger.info(`Attempting ${type} with ${provider.name} (${providerModel})`);
        const result = await provider.execute(type, {
          ...params,
          model: providerModel,
        });
        
        // Record success
        const stats = this.providerStats.get(provider.name);
        stats.recordSuccess(result.tokensUsed || 0);

        const attemptLatencyMs = Date.now() - providerStart;
        fallbackTrace.push({
          provider: provider.name,
          model: providerModel,
          status: 'success',
          latencyMs: attemptLatencyMs,
        });
        this.metrics.totalLatencyMs += Date.now() - requestStart;
        if (fallbackTrace.filter((attempt) => attempt.status === 'failed').length > 0) {
          this.metrics.totalFallbacks += 1;
        }
        
        logger.info(`✓ Success with ${provider.name}`);
        return {
          ...result,
          usedProvider: provider.name,
          requestLatencyMs: Date.now() - requestStart,
          fallbackTrace,
        };
      } catch (error) {
        lastError = error;
        const stats = this.providerStats.get(provider.name);
        stats.recordFailure(error);
        fallbackTrace.push({
          provider: provider.name,
          model: providerModel,
          status: 'failed',
          code: error.status || error.response?.status || 500,
          message: error.message,
          latencyMs: Date.now() - providerStart,
        });
        
        logger.warn(`✗ ${provider.name} failed: ${error.message}`);
      }
    }

    this.metrics.totalFailures += 1;
    this.metrics.totalLatencyMs += Date.now() - requestStart;

    const exhaustedError = new Error(`All providers failed. Last error: ${lastError?.message}`);
    exhaustedError.status = lastError?.status || 503;
    exhaustedError.fallbackTrace = fallbackTrace;
    throw exhaustedError;
  }

  getStats() {
    const stats = {};
    this.providerStats.forEach((stat, name) => {
      stats[name] = stat.toString();
    });
    return stats;
  }

  getProvidersList() {
    return this.providers.map(p => ({
      name: p.name,
      type: p.type,
      capabilities: p.capabilities,
      configured: true,
    }));
  }

  getOperationalMetrics() {
    const avgLatencyMs = this.metrics.totalRequests === 0
      ? 0
      : Number((this.metrics.totalLatencyMs / this.metrics.totalRequests).toFixed(2));

    return {
      totalRequests: this.metrics.totalRequests,
      totalFailures: this.metrics.totalFailures,
      totalFallbacks: this.metrics.totalFallbacks,
      averageLatencyMs: avgLatencyMs,
      lastRequestAt: this.metrics.lastRequestAt,
    };
  }
}

// Singleton instance
let instance = null;

function getProviderManager() {
  if (!instance) {
    instance = new ProviderManager();
  }
  return instance;
}

function initializeProviders() {
  const manager = getProviderManager();
  manager.initializeProviders();
}

module.exports = {
  getProviderManager,
  initializeProviders,
};
