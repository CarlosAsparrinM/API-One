const MODEL_CATALOG = [
  {
    id: 'groq:llama-3.1-8b-instant',
    provider: 'groq',
    upstreamModel: 'llama-3.1-8b-instant',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'groq:llama-3.3-70b-versatile',
    provider: 'groq',
    upstreamModel: 'llama-3.3-70b-versatile',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'groq:mixtral-8x7b-32768',
    provider: 'groq',
    upstreamModel: 'mixtral-8x7b-32768',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'gemini:gemini-2.0-flash',
    provider: 'gemini',
    upstreamModel: 'gemini-2.0-flash',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'gemini:gemini-1.5-flash',
    provider: 'gemini',
    upstreamModel: 'gemini-1.5-flash',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'gemini:models/embedding-001',
    provider: 'gemini',
    upstreamModel: 'models/embedding-001',
    capabilities: ['embedding'],
  },
];

const DEFAULT_PROVIDER_MODELS = {
  groq: {
    chat: 'mixtral-8x7b-32768',
    completion: 'mixtral-8x7b-32768',
  },
  gemini: {
    chat: 'gemini-2.0-flash',
    completion: 'gemini-2.0-flash',
    embedding: 'models/embedding-001',
  },
};

function getModelCatalog() {
  return [...MODEL_CATALOG];
}

function getOpenAIModels() {
  const now = Math.floor(Date.now() / 1000);
  return MODEL_CATALOG.filter((model) => model.capabilities.includes('chat') || model.capabilities.includes('completion')).map((model) => ({
    id: model.id,
    object: 'model',
    created: now,
    owned_by: model.provider,
  }));
}

function getDefaultModel(providerName, operationType) {
  return DEFAULT_PROVIDER_MODELS[providerName]?.[operationType] || null;
}

function resolveModelForProvider(requestedModel, providerName, operationType) {
  if (!requestedModel || requestedModel === 'auto') {
    return getDefaultModel(providerName, operationType);
  }

  if (requestedModel.includes(':')) {
    const [provider, ...rest] = requestedModel.split(':');
    if (provider !== providerName) {
      return null;
    }
    return rest.join(':');
  }

  const byExact = MODEL_CATALOG.find((model) => model.provider === providerName && model.upstreamModel === requestedModel);
  if (byExact) {
    return byExact.upstreamModel;
  }

  return getDefaultModel(providerName, operationType);
}

module.exports = {
  getModelCatalog,
  getOpenAIModels,
  getDefaultModel,
  resolveModelForProvider,
};
