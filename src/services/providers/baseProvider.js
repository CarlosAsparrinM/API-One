class BaseProvider {
  constructor(name, supportedTypes = []) {
    this.name = name;
    this.supportedTypes = supportedTypes;
  }

  supports(type) {
    return this.supportedTypes.includes(type);
  }

  validateParams(type, params) {
    if (!this.supports(type)) {
      throw new Error(`${this.name} does not support operation: ${type}`);
    }

    if (!params || typeof params !== 'object') {
      throw new Error('Missing params');
    }

    if (type === 'chat') {
      if (!Array.isArray(params.messages) || params.messages.length === 0) {
        throw new Error('chat requires non-empty messages array');
      }
    }

    if (type === 'completion') {
      const hasPrompt = typeof params.prompt === 'string' && params.prompt.trim();
      const hasMessages = Array.isArray(params.messages) && params.messages.length > 0;
      if (!hasPrompt && !hasMessages) {
        throw new Error('completion requires prompt or messages');
      }
    }

    if (type === 'embedding') {
      if (typeof params.text !== 'string' || !params.text.trim()) {
        throw new Error('embedding requires non-empty text');
      }
    }
  }
}

module.exports = BaseProvider;
