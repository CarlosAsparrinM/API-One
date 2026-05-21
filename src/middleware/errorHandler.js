const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const status = Number(err?.status || err?.code) || 500;
  const requestId = req?.requestId || null;

  logger.error({
    type: 'unhandled_error',
    requestId,
    status,
    message: err?.message || String(err),
    stack: err?.stack,
    path: req?.originalUrl,
    method: req?.method,
  });

  const payload = {
    error: {
      message: err?.message || 'Internal server error',
      type: status >= 500 ? 'server_error' : 'request_error',
      code: status,
      request_id: requestId,
      fallback_trace: err?.fallbackTrace || err?.fallback_trace || undefined,
    },
  };

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json(payload);
}

module.exports = errorHandler;
