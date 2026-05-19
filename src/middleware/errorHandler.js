const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    status,
    requestId: req.requestId,
    fallbackTrace: err.fallbackTrace || null,
  });

  if (req.originalUrl.startsWith('/v1/')) {
    return res.status(status).json({
      error: {
        message,
        type: status >= 500 ? 'server_error' : 'invalid_request_error',
        param: null,
        code: status,
        request_id: req.requestId,
      },
    });
  }

  return res.status(status).json({
    error: {
      status,
      message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
};

module.exports = errorHandler;
