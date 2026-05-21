const express = require('express');
const { getProviderManager } = require('../services/providerManager');

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({
    name: 'API-ONE',
    status: 'ok',
    docs: {
      readme: '/README.md',
      endpoints: '/README.md#endpoints-detallado',
      use_cases: '/README.md#casos-de-uso-ejemplos-practicos',
      health: '/health',
      stats: '/stats',
    },
  });
});

router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    uptime_s: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/stats', (req, res) => {
  const manager = getProviderManager();
  return res.json({
    success: true,
    data: manager.getStats(),
  });
});

module.exports = router;
