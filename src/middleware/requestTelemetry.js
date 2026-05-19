const crypto = require('crypto');
const logger = require('../utils/logger');

function requestTelemetry(req, res, next) {
  req.requestId = crypto.randomUUID();
  const start = process.hrtime.bigint();
  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const latencyMs = Number(elapsedNs / BigInt(1e6));

    logger.info({
      type: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs,
      apiKeyId: req.apiKeyId || null,
      ip: req.ip,
    });
  });

  next();
}

module.exports = requestTelemetry;
