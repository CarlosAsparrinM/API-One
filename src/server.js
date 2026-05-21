require('dotenv').config();

const express = require('express');

const logger = require('./utils/logger');
const corsMiddleware = require('./middleware/cors');
const requestTelemetry = require('./middleware/requestTelemetry');
const rateLimit = require('./middleware/rateLimit');
const authApiKey = require('./middleware/authApiKey');
const errorHandler = require('./middleware/errorHandler');

const healthRouter = require('./routes/healthRouter');
const openaiRouter = require('./routes/openaiRouter');

const app = express();
app.disable('x-powered-by');

const PORT = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '2mb' }));
app.use(requestTelemetry);
app.use(rateLimit);

// Public routes
app.use('/', healthRouter);

// Protected routes
app.use('/v1', authApiKey, openaiRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({
    type: 'startup',
    message: `API-ONE listening on http://localhost:${PORT}`,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      stats: `http://localhost:${PORT}/stats`,
      chat: `http://localhost:${PORT}/v1/chat/completions`,
      embeddings: `http://localhost:${PORT}/v1/embeddings`,
      models: `http://localhost:${PORT}/v1/models`,
    },
  });
});
