const logger = require('../utils/logger');

const CerebrasProvider = require('./providers/cerebrasProvider');
const GroqProvider = require('./providers/groqProvider');
const GeminiProvider = require('./providers/geminiProvider');

function isEnabled(providerName) {
  const key = `${providerName.toUpperCase()}_ENABLED`;
  const raw = process.env[key];
  if (raw === undefined) return true;
  return String(raw).toLowerCase() === 'true';
}

class ProviderManager {
  constructor() {
    this.providers = {
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

  getStats() {
    return {
      providers: Object.keys(this.providers).map((name) => {
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

  async executeRoute(type, params) {
    if (!params?.model) {
      throw new Error("Client must specify a model parameter (e.g. 'groq:llama-3.3-70b-versatile')");
    }

    const requestedModels = params.model.split(',').map(m => m.trim()).filter(Boolean);
    if (requestedModels.length === 0) {
      throw new Error("Invalid model string. Must be a comma-separated list of 'provider:model'");
    }

    const fallbackTrace = [];
    let lastErr = null;

    for (const requestedModel of requestedModels) {
      if (!requestedModel.includes(':')) {
        fallbackTrace.push({ model: requestedModel, status: 'skipped', reason: 'invalid_format' });
        lastErr = new Error(`Model string must include provider prefix, e.g. 'groq:${requestedModel}'`);
        continue;
      }

      const [providerName, ...modelParts] = requestedModel.split(':');
      const upstreamModel = modelParts.join(':');

      const provider = this.providers[providerName];
      if (!provider) {
        fallbackTrace.push({ provider: providerName, model: upstreamModel, status: 'skipped', reason: 'unknown_provider' });
        lastErr = new Error(`Unknown provider: ${providerName}`);
        continue;
      }

      const enabled = isEnabled(providerName);
      const configured = typeof provider.isConfigured === 'function' ? provider.isConfigured() : true;
      const supports = typeof provider.supports === 'function' ? provider.supports(type) : true;

      if (!enabled || !configured || !supports) {
        fallbackTrace.push({
          provider: providerName,
          model: upstreamModel,
          status: 'skipped',
          reason: !enabled ? 'disabled' : !configured ? 'not_configured' : 'unsupported',
        });
        lastErr = new Error(`Provider ${providerName} is unavailable or unsupported`);
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
        fallbackTrace.push({ provider: providerName, model: upstreamModel, status: 'success', latencyMs });

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
          model: upstreamModel,
          status: 'error',
          latencyMs,
          error: err?.message || String(err),
          statusCode: err?.status || err?.originalError?.response?.status || null,
        });
        logger.warn({
          type: 'provider_route_error',
          provider: providerName,
          model: upstreamModel,
          operation: type,
          message: err?.message || String(err),
        });
        continue; // Fallback to next model in the list
      }
    }

    const finalError = lastErr || new Error('No models from the requested list were successful');
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
