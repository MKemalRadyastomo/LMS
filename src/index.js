require('dotenv').config(); // Load environment variables at the very beginning

const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const ConfigValidator = require('./utils/configValidator');
const notificationService = require('./services/notification.service');

// Validate configuration before starting the server
logger.info('Validating application configuration...');
const configValidation = ConfigValidator.validateAll();

if (configValidation.valid) {
  // Log configuration summary for debugging
  const configSummary = ConfigValidator.getConfigSummary();
  logger.info('Configuration summary:', configSummary);
}

// Create HTTP server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.env} mode`);

  // Initialize WebSocket notification service
  try {
    notificationService.initialize(server);
    logger.info('WebSocket notification service initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize WebSocket service: ${error.message}`);
  }

  // Log startup performance metrics
  if (process.env.NODE_ENV === 'development') {
    const memUsage = process.memoryUsage();
    logger.info('Startup memory usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err);

  // Close server & exit process
  server.close(() => {
    notificationService.shutdown();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err);

  // Shutdown services and exit process
  notificationService.shutdown();
  process.exit(1);
});

module.exports = server;
