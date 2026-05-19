const logger = require('../../utils/logger');

class BaseProvider {
  constructor(name, type = ['chat', 'completion']) {
    this.name = name;
    this.type = type;
    this.capabilities = {
      chat: type.includes('chat'),
      completion: type.includes('completion'),
      embedding: type.includes('embedding'),
    };
  }

  isConfigured() {
    throw new Error('isConfigured must be implemented');
  }

  async execute(type, params) {
    throw new Error('execute must be implemented');
  }

  validateParams(type, params) {
    if (!params) {
      throw new Error('Parameters cannot be empty');
    }

    if (type === 'chat' || type === 'completion') {
      if (!params.prompt && !params.messages) {
        throw new Error('Either prompt or messages must be provided');
      }
    }

    if (type === 'embedding') {
      if (!params.text) {
        throw new Error('Text is required for embeddings');
      }
    }

    return true;
  }

  isRateLimitError(error) {
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.response?.status;
    return status === 429 || message.includes('rate limit') || message.includes('quota');
  }

  isAuthError(error) {
    const status = error.status || error.response?.status;
    return status === 401 || status === 403;
  }
}

module.exports = BaseProvider;
