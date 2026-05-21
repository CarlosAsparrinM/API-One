const logger = require('../utils/logger');
const { resolveModelForProvider, getDefaultModel } = require('../config/modelCatalog');

const SambanovaProvider = require('./providers/sambanovaProvider');
const CerebrasProvider = require('./providers/cerebrasProvider');
const GroqProvider = require('./providers/groqProvider');
const GeminiProvider = require('./providers/geminiProvider');

function parsePriority() {
  const raw = process.env.AI_PROVIDER_PRIORITY || 'sambanova,cerebras,groq,gemini';
  return raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function isEnabled(providerName) {
  const key = `${providerName.toUpperCase()}_ENABLED`;
  const raw = process.env[key];
  if (raw === undefined) return true;
  return String(raw).toLowerCase() === 'true';
}

class ProviderManager {
  constructor() {
    this.providers = {
      sambanova: new SambanovaProvider(),
      cerebras: new CerebrasProvider(),
      groq: new GroqProvider(),
      gemini: new GeminiProvider(),
    };

    this.stats = Object.fromEntries(
      Object.keys(this.providers).map((name) => [
        name,
        {
          attempts: 0,
          successes: 0,
          failures: 0,
          lastError: null,
          lastErrorAt: null,
          lastSuccessAt: null,
        },
      ])
    );
  }

  getProviderOrder() {
    const desired = parsePriority();
    const all = Object.keys(this.providers);
    const order = [];

    for (const p of desired) {
      if (all.includes(p) && !order.includes(p)) order.push(p);
    }
    for (const p of all) {
      if (!order.includes(p)) order.push(p);
    }

    return order;
  }

  getStats() {
    const order = this.getProviderOrder();
    return {
      provider_priority: order,
      providers: order.map((name) => {
        const provider = this.providers[name];
        const enabled = isEnabled(name);
        const configured = typeof provider.isConfigured === 'function' ? provider.isConfigured() : true;

        return {
          name,
          enabled,
          configured,
          supportedTypes: provider.supportedTypes || [],
          stats: this.stats[name],
        };
      }),
    };
  }

  _markAttempt(provider) {
    this.stats[provider].attempts += 1;
  }
  _markSuccess(provider) {
    this.stats[provider].successes += 1;
    this.stats[provider].lastSuccessAt = new Date().toISOString();
    this.stats[provider].lastError = null;
  }
  _markFailure(provider, err) {
    this.stats[provider].failures += 1;
    this.stats[provider].lastError = err?.message || String(err);
    this.stats[provider].lastErrorAt = new Date().toISOString();
  }

  async executeWithFallback(type, params) {
    const order = this.getProviderOrder();
    const fallbackTrace = [];

    // Normalize model: api-fallback behaves like auto
    const requestedModel =
      !params?.model || params.model === 'api-fallback' ? 'auto' : String(params.model);

    let lastErr = null;

    for (const providerName of order) {
      const provider = this.providers[providerName];
      if (!provider) continue;

      const enabled = isEnabled(providerName);
      const configured = typeof provider.isConfigured === 'function' ? provider.isConfigured() : true;
      const supports = typeof provider.supports === 'function' ? provider.supports(type) : true;

      if (!enabled || !configured || !supports) {
        fallbackTrace.push({
          provider: providerName,
          status: 'skipped',
          reason: !enabled ? 'disabled' : !configured ? 'not_configured' : 'unsupported',
        });
        continue;
      }

      const upstreamModel = resolveModelForProvider(requestedModel, providerName, type) || getDefaultModel(providerName, type);
      if (!upstreamModel) {
        fallbackTrace.push({
          provider: providerName,
          status: 'skipped',
          reason: 'model_not_applicable',
        });
        continue;
      }

      const execParams = {
        ...params,
        model: upstreamModel,
      };

      const start = Date.now();
      this._markAttempt(providerName);

      try {
        const result = await provider.execute(type, execParams);
        const latencyMs = Date.now() - start;

        this._markSuccess(providerName);
        fallbackTrace.push({ provider: providerName, status: 'success', latencyMs });

        return {
          ...result,
          usedProvider: providerName,
          requestLatencyMs: latencyMs,
          fallbackTrace,
        };
      } catch (err) {
        const latencyMs = Date.now() - start;
        lastErr = err;
        this._markFailure(providerName, err);
        fallbackTrace.push({
          provider: providerName,
          status: 'error',
          latencyMs,
          error: err?.message || String(err),
          statusCode: err?.status || err?.originalError?.response?.status || null,
        });
        logger.warn({
          type: 'provider_fallback',
          provider: providerName,
          operation: type,
          message: err?.message || String(err),
        });
        continue;
      }
    }

    const finalError = lastErr || new Error('No provider available for this request');
    finalError.fallbackTrace = fallbackTrace;
    throw finalError;
  }
}

let instance = null;

function getProviderManager() {
  if (!instance) {
    instance = new ProviderManager();
  }
  return instance;
}

module.exports = {
  getProviderManager,
};
