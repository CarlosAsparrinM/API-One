const crypto = require('crypto');
const express = require('express');
const { getProviderManager } = require('../services/providerManager');
const contextManager = require('../services/contextManager');

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

function formatChatCompletion(result, requestModel, extraMetadata = {}) {
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
      ...extraMetadata,
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

    // Embeddings + Retrieval context (only active when CONTEXT_ENABLED=true
    // and a conversation_id is provided by the client)
    const { conversationId, messagesForModel, contextMeta } = await contextManager.prepareChatMessages(req);

    const manager = getProviderManager();
    const result = await manager.executeWithFallback('chat', {
      model: internalModel,
      messages: messagesForModel || messages,
      temperature,
      maxTokens: max_tokens,
      additionalParams,
    });

    await contextManager.persistAssistantTurn({
      conversationId,
      assistantText: result.response,
    });

    const payload = formatChatCompletion(result, model, {
      conversation_id: conversationId || undefined,
      context: contextMeta,
    });

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

// OpenAI-compatible embeddings endpoint
router.post('/embeddings', async (req, res, next) => {
  try {
    const { input, model } = req.body || {};
    const embeddingModel = model || process.env.CONTEXT_EMBEDDING_MODEL || 'auto';

    if (typeof input !== 'string' && !Array.isArray(input)) {
      return res.status(400).json({
        error: {
          message: 'input must be a string or an array of strings.',
          type: 'invalid_request_error',
          code: 400,
        },
      });
    }

    const items = Array.isArray(input) ? input : [input];
    const manager = getProviderManager();

    const data = [];
    let totalTokens = 0;

    for (let i = 0; i < items.length; i++) {
      const text = String(items[i] || '');
      const result = await manager.executeWithFallback('embedding', {
        model: embeddingModel,
        text,
      });
      totalTokens += result.tokensUsed || 0;
      data.push({
        object: 'embedding',
        index: i,
        embedding: result.embedding,
      });
    }

    return res.json({
      object: 'list',
      data,
      model: embeddingModel,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// Debug endpoints for conversation memory (requires API key)
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || '').trim();
    const limit = Number(req.query.limit || 100);
    const includeArchived = String(req.query.includeArchived || 'false').toLowerCase() === 'true';

    const messages = await contextManager.getConversationMessages(conversationId, {
      limit: Math.min(Math.max(limit, 1), 500),
      includeArchived,
    });

    return res.json({
      success: true,
      data: {
        conversation_id: conversationId,
        count: messages.length,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          archived: !!m.archived,
          source: m.source,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/:id/summary', async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || '').trim();
    const summary = await contextManager.getConversationSummary(conversationId);

    return res.json({
      success: true,
      data: {
        conversation_id: conversationId,
        summary: summary?.summary || null,
        updatedAt: summary?.updatedAt || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
