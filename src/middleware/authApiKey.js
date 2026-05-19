const logger = require('../utils/logger');

function normalizeApiKeys(value) {
  return (value || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

function extractBearerToken(headerValue) {
  if (!headerValue) {
    return null;
  }
  const [scheme, token] = headerValue.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }
  return token.trim();
}

function authApiKey(req, res, next) {
  const configuredKeys = normalizeApiKeys(process.env.API_AUTH_KEYS);
  if (configuredKeys.length === 0) {
    logger.error('API_AUTH_KEYS is empty. API key authentication cannot be enforced.');
    return res.status(500).json({
      error: {
        message: 'Server authentication is not configured.',
        type: 'server_error',
        code: 500,
      },
    });
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Missing Bearer API key.',
        type: 'authentication_error',
        code: 401,
      },
    });
  }

  if (!configuredKeys.includes(token)) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key.',
        type: 'authentication_error',
        code: 401,
      },
    });
  }

  req.apiKeyId = `key_${token.slice(-6)}`;
  return next();
}

module.exports = authApiKey;
