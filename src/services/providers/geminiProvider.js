const axios = require('axios');
const BaseProvider = require('./baseProvider');
const logger = require('../../utils/logger');

class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', ['chat', 'completion', 'embedding']);
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai';
    this.defaultModel = 'gemini-2.0-flash';
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey !== 'your_gemini_key';
  }

  async execute(type, params) {
    this.validateParams(type, params);

    const client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    try {
      if (type === 'chat' || type === 'completion') {
        return await this.handleCompletion(client, params);
      } else if (type === 'embedding') {
        return await this.handleEmbedding(client, params);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async handleCompletion(client, params) {
    const payload = {
      model: params.model || this.defaultModel,
      messages: params.messages || [{ role: 'user', content: params.prompt }],
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2000,
      ...params.additionalParams,
    };

    const url = `/chat/completions?key=${this.apiKey}`;
    const response = await client.post(url, payload);
    const result = response.data;

    return {
      success: true,
      provider: 'gemini',
      response: result.choices[0].message.content,
      model: result.model,
      tokensUsed: result.usage?.total_tokens || 0,
      raw: result,
    };
  }

  async handleEmbedding(client, params) {
    const url = `/embeddings?key=${this.apiKey}`;
    const payload = {
      model: params.model || 'models/embedding-001',
      input: params.text,
    };

    const response = await client.post(url, payload);
    const result = response.data;

    return {
      success: true,
      provider: 'gemini',
      embedding: result.data[0].embedding,
      tokensUsed: result.usage?.total_tokens || 0,
      raw: result,
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
      type: data?.error?.type,
    });

    throw err;
  }
}

module.exports = GeminiProvider;
