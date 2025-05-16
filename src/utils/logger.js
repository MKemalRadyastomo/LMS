const winston = require('winston');

// Define log format
const logFormat = winston.format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'lms-backend' },
  transports: [
    // Write all logs error (and below) to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
  ],
});

// If we're not in production then log to the console with a simpler format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }));
}

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
