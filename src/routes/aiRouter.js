const express = require('express');
const router = express.Router();
const { getProviderManager } = require('../services/providerManager');

router.post('/chat', async (req, res, next) => {
  try {
    const { messages, prompt, model, temperature, maxTokens } = req.body;

    const manager = getProviderManager();
    const result = await manager.executeWithFallback('chat', {
      messages,
      prompt,
      model,
      temperature,
      maxTokens,
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        provider: result.usedProvider,
        tokensUsed: result.tokensUsed,
        model: result.model,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/completion', async (req, res, next) => {
  try {
    const { prompt, model, temperature, maxTokens } = req.body;

    const manager = getProviderManager();
    const result = await manager.executeWithFallback('completion', {
      prompt,
      model,
      temperature,
      maxTokens,
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        provider: result.usedProvider,
        tokensUsed: result.tokensUsed,
        model: result.model,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/embedding', async (req, res, next) => {
  try {
    const { text, model } = req.body;

    if (!text) {
      return res.status(400).json({
        error: {
          message: 'Text is required for embedding',
        },
      });
    }

    const manager = getProviderManager();
    const result = await manager.executeWithFallback('embedding', {
      text,
      model,
    });

    res.json({
      success: true,
      data: {
        embedding: result.embedding,
        provider: result.usedProvider,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/providers', (req, res) => {
  try {
    const manager = getProviderManager();
    const providers = manager.getProvidersList();

    res.json({
      success: true,
      data: {
        providers,
        count: providers.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
      },
    });
  }
});

router.get('/stats', (req, res) => {
  try {
    const manager = getProviderManager();
    const stats = manager.getStats();
    const metrics = manager.getOperationalMetrics();

    res.json({
      success: true,
      data: {
        providers: stats,
        metrics,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
      },
    });
  }
});

module.exports = router;
