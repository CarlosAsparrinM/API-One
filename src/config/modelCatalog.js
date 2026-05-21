const MODEL_CATALOG = [
  // SambaNova
  {
    id: 'sambanova:Meta-Llama-3.3-70B-Instruct',
    provider: 'sambanova',
    upstreamModel: 'Meta-Llama-3.3-70B-Instruct',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:Llama-4-Maverick-17B-128E-Instruct',
    provider: 'sambanova',
    upstreamModel: 'Llama-4-Maverick-17B-128E-Instruct',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:DeepSeek-V3.1',
    provider: 'sambanova',
    upstreamModel: 'DeepSeek-V3.1',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:DeepSeek-V3.2',
    provider: 'sambanova',
    upstreamModel: 'DeepSeek-V3.2',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:MiniMax-M2.7',
    provider: 'sambanova',
    upstreamModel: 'MiniMax-M2.7',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:gemma-3-12b-it',
    provider: 'sambanova',
    upstreamModel: 'gemma-3-12b-it',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'sambanova:gpt-oss-120b',
    provider: 'sambanova',
    upstreamModel: 'gpt-oss-120b',
    capabilities: ['chat', 'completion'],
  },
  // Cerebras
  {
    id: 'cerebras:llama-3.1-70b',
    provider: 'cerebras',
    upstreamModel: 'llama-3.1-70b',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'cerebras:llama-3.1-8b',
    provider: 'cerebras',
    upstreamModel: 'llama-3.1-8b',
    capabilities: ['chat', 'completion'],
  },
  // Groq - ACTIVE MODELS (as of 2026-05)
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
    id: 'groq:openai/gpt-oss-20b',
    provider: 'groq',
    upstreamModel: 'openai/gpt-oss-20b',
    capabilities: ['chat', 'completion'],
  },
  {
    id: 'groq:openai/gpt-oss-120b',
    provider: 'groq',
    upstreamModel: 'openai/gpt-oss-120b',
    capabilities: ['chat', 'completion'],
  },
  // Gemini
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
  sambanova: {
    chat: 'Meta-Llama-3.3-70B-Instruct',
    completion: 'Meta-Llama-3.3-70B-Instruct',
  },
  cerebras: {
    chat: 'llama-3.1-70b',
    completion: 'llama-3.1-70b',
  },
  groq: {
    chat: 'llama-3.1-8b-instant',
    completion: 'llama-3.1-8b-instant',
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
  const envOverrides = {
    sambanova: process.env.SAMBANOVA_MODEL,
    cerebras: process.env.CEREBRAS_MODEL,
  };
  const envModel = envOverrides[providerName];
  if (envModel) {
    return envModel;
  }
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
