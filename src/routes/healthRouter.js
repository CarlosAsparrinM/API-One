const express = require('express');
const router = express.Router();
const { getProviderManager } = require('../services/providerManager');

router.get('/', (req, res) => {
  try {
    const manager = getProviderManager();
    const healthyProviders = manager.getHealthyProviders();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: {
        total: manager.providers.length,
        healthy: healthyProviders.length,
        list: healthyProviders.map(p => p.name),
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router;
