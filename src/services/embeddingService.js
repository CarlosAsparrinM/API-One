const logger = require('../utils/logger');
const { getProviderManager } = require('./providerManager');
const { sha256 } = require('../utils/contentHash');

class EmbeddingService {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 2000;
  }

  _getCache(key) {
    return this.cache.get(key);
  }

  _setCache(key, value) {
    this.cache.set(key, value);
    if (this.cache.size > this.maxCacheSize) {
      // Simple eviction: delete first inserted
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  async embedText(text) {
    const cleaned = String(text || '').trim();
    if (!cleaned) {
      return null;
    }

    const maxChars = Number(process.env.CONTEXT_EMBED_MAX_CHARS || 8000);
    const input = cleaned.length > maxChars ? cleaned.slice(0, maxChars) : cleaned;
    const cacheKey = sha256(input);

    const cached = this._getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const embeddingModel = process.env.CONTEXT_EMBEDDING_MODEL || 'auto';
    const manager = getProviderManager();

    try {
      const result = await manager.executeWithFallback('embedding', {
        model: embeddingModel,
        text: input,
      });

      const embedding = result.embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Empty embedding');
      }

      this._setCache(cacheKey, embedding);
      return embedding;
    } catch (e) {
      logger.warn(`EmbeddingService failed: ${e.message}`);
      return null;
    }
  }
}

let instance = null;

function getEmbeddingService() {
  if (!instance) {
    instance = new EmbeddingService();
  }
  return instance;
}

module.exports = {
  getEmbeddingService,
};
