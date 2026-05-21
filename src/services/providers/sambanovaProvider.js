const axios = require('axios');
const BaseProvider = require('./baseProvider');
const logger = require('../../utils/logger');

class SambanovaProvider extends BaseProvider {
  constructor() {
    super('sambanova', ['chat', 'completion']);
    this.apiKey = process.env.SAMBANOVA_API_KEY;
    this.baseURL = 'https://api.sambanova.ai/v1';
    this.defaultModel = process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.3-70B-Instruct';
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey !== 'your_sambanova_key';
  }

  async execute(type, params) {
    this.validateParams(type, params);

    const client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    try {
      if (type === 'chat' || type === 'completion') {
        return await this.handleCompletion(client, params);
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
      top_p: 0.95,
      ...params.additionalParams,
    };

    const response = await client.post('/chat/completions', payload);
    const result = response.data;

    return {
      success: true,
      provider: 'sambanova',
      response: result.choices[0].message.content,
      model: result.model,
      tokensUsed: result.usage?.total_tokens || 0,
      raw: result,
    };
  }

  handleError(error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.error?.message || error.message;

    const err = new Error(`SambaNova Error: ${message}`);
    err.status = status;
    err.originalError = error;

    logger.error({
      provider: 'sambanova',
      status,
      message,
      type: data?.error?.type,
    });

    throw err;
  }
}

module.exports = SambanovaProvider;
