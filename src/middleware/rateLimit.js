const buckets = new Map();

function getConfig() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000,
    maxRequests: Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : 120,
  };
}

function rateLimit(req, res, next) {
  const { windowMs, maxRequests } = getConfig();
  const key = req.apiKeyId || req.ip || 'anonymous';
  const now = Date.now();

  const current = buckets.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    res.setHeader('x-ratelimit-limit', maxRequests);
    res.setHeader('x-ratelimit-remaining', Math.max(0, maxRequests - 1));
    res.setHeader('x-ratelimit-reset', Math.ceil((now + windowMs) / 1000));
    return next();
  }

  if (current.count >= maxRequests) {
    res.setHeader('x-ratelimit-limit', maxRequests);
    res.setHeader('x-ratelimit-remaining', 0);
    res.setHeader('x-ratelimit-reset', Math.ceil((current.windowStart + windowMs) / 1000));
    return res.status(429).json({
      error: {
        message: 'Rate limit exceeded for this API key.',
        type: 'rate_limit_error',
        code: 429,
      },
    });
  }

  current.count += 1;
  buckets.set(key, current);
  res.setHeader('x-ratelimit-limit', maxRequests);
  res.setHeader('x-ratelimit-remaining', Math.max(0, maxRequests - current.count));
  res.setHeader('x-ratelimit-reset', Math.ceil((current.windowStart + windowMs) / 1000));
  return next();
}

module.exports = rateLimit;
