const axios = require('axios');
const BaseProvider = require('./baseProvider');
const logger = require('../../utils/logger');

function normalizeSystem(messages) {
  const systemParts = [];
  for (const m of messages || []) {
    if (m?.role === 'system' && typeof m.content === 'string' && m.content.trim()) {
      systemParts.push(m.content.trim());
    }
  }
  return systemParts.join('\n\n') || null;
}

function toGeminiContents(messages) {
  const contents = [];
  for (const m of messages || []) {
    if (!m || typeof m.content !== 'string') continue;
    const text = m.content.trim();
    if (!text) continue;

    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text }] });
    } else if (m.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text }] });
    }
  }
  return contents;
}

class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', ['chat', 'completion', 'embedding']);
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey !== 'your_gemini_key';
  }

  async execute(type, params) {
    this.validateParams(type, params);

    try {
      if (type === 'embedding') {
        return await this.handleEmbedding(params);
      }
      if (type === 'chat' || type === 'completion') {
        return await this.handleChat(params);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async handleChat(params) {
    const messages = params.messages || [{ role: 'user', content: params.prompt }];
    const model = params.model;
    if (!model) throw new Error('GeminiProvider requires params.model');
    const systemText = normalizeSystem(messages);
    const contents = toGeminiContents(messages);

    const url = `${this.baseURL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens ?? 2000,
      },
      ...(systemText
        ? { systemInstruction: { parts: [{ text: systemText }] } }
        : {}),
      ...params.additionalParams,
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60_000,
    });

    const data = response.data;
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || '')
        .join('')
        .trim() || '';

    return {
      success: true,
      provider: 'gemini',
      response: text,
      model,
      tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
      raw: data,
    };
  }

  async handleEmbedding(params) {
    const model = params.model;
    if (!model) throw new Error('GeminiProvider requires params.model for embedding');
    const url = `${this.baseURL}/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      content: {
        parts: [{ text: params.text }],
      },
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60_000,
    });

    const data = response.data;
    const embedding = data?.embedding?.values;

    return {
      success: true,
      provider: 'gemini',
      embedding: Array.isArray(embedding) ? embedding : [],
      model,
      tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
      raw: data,
    };
  }

  handleError(error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.error?.message || error.message;

    const err = new Error(`Gemini Error: ${message}`);
    err.status = status;
    err.originalError = error;

    logger.error({
      provider: 'gemini',
      status,
      message,
    });

    throw err;
  }
}

module.exports = GeminiProvider;
