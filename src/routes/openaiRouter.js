const crypto = require('crypto');
const express = require('express');
const { getProviderManager } = require('../services/providerManager');
const { getOpenAIModels } = require('../config/modelCatalog');

const router = express.Router();

function buildUsage(rawUsage, fallbackTotalTokens) {
  const promptTokens = rawUsage?.prompt_tokens || rawUsage?.input_tokens || 0;
  const completionTokens = rawUsage?.completion_tokens || rawUsage?.output_tokens || 0;
  const totalTokens = rawUsage?.total_tokens || fallbackTotalTokens || promptTokens + completionTokens;

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens || Math.max(0, totalTokens - promptTokens),
    total_tokens: totalTokens,
  };
}

function formatChatCompletion(result, requestModel) {
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const responseModel = `${result.usedProvider}:${result.model}`;
  const model = requestModel && requestModel !== 'auto' ? requestModel : responseModel;

  return {
    id,
    object: 'chat.completion',
    created,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.response,
        },
        finish_reason: 'stop',
      },
    ],
    usage: buildUsage(result.raw?.usage, result.tokensUsed),
    metadata: {
      provider: result.usedProvider,
      request_latency_ms: result.requestLatencyMs,
      fallback_trace: result.fallbackTrace,
    },
  };
}

router.get('/models', (req, res) => {
  // FORM 1: Auto-fallback mode - only return 'api-fallback' model
  const data = [
    {
      id: 'api-fallback',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'api-fallback',
      description: 'Automatic fallback across configured AI providers (Groq → Gemini)',
    },
  ];

  res.json({
    object: 'list',
    data,
  });
});

router.post('/chat/completions', async (req, res, next) => {
  try {
    const { model = 'api-fallback', messages, temperature, max_tokens, stream = false, ...additionalParams } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages must be a non-empty array.',
          type: 'invalid_request_error',
          code: 400,
        },
      });
    }

    // FORM 1: Always use 'auto' internally for automatic fallback
    const internalModel = 'auto';

    const manager = getProviderManager();
    const result = await manager.executeWithFallback('chat', {
      model: internalModel,
      messages,
      temperature,
      maxTokens: max_tokens,
      additionalParams,
    });

    const payload = formatChatCompletion(result, model);

    if (!stream) {
      return res.json(payload);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chunkBase = {
      id: payload.id,
      object: 'chat.completion.chunk',
      created: payload.created,
      model: payload.model,
    };

    const firstChunk = {
      ...chunkBase,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: payload.choices[0].message.content },
          finish_reason: null,
        },
      ],
    };

    const finalChunk = {
      ...chunkBase,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };

    res.write(`data: ${JSON.stringify(firstChunk)}\n\n`);
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
