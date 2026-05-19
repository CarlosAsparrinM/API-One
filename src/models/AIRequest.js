class AIRequest {
  constructor(type, params, triedProviders = []) {
    this.type = type;
    this.params = params;
    this.triedProviders = triedProviders;
    this.createdAt = new Date();
  }

  addTriedProvider(provider) {
    this.triedProviders.push({
      name: provider.name,
      error: provider.error,
      timestamp: new Date(),
    });
  }

  hasTriedProvider(providerName) {
    return this.triedProviders.some(p => p.name === providerName);
  }
}

module.exports = AIRequest;
