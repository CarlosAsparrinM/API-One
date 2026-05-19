require('dotenv').config();
const express = require('express');
const AIRouter = require('./routes/aiRouter');
const OpenAIRouter = require('./routes/openaiRouter');
const HealthRouter = require('./routes/healthRouter');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const corsMiddleware = require('./middleware/cors');
const requestTelemetry = require('./middleware/requestTelemetry');
const authApiKey = require('./middleware/authApiKey');
const rateLimit = require('./middleware/rateLimit');
const { initializeProviders } = require('./services/providerManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(requestTelemetry);
app.use(corsMiddleware);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize providers
initializeProviders();

// Routes
app.use('/health', HealthRouter);
app.use('/api', authApiKey, rateLimit, AIRouter);
app.use('/v1', authApiKey, rateLimit, OpenAIRouter);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 API-One Server running on port ${PORT}`);
});

module.exports = app;
