const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

// FIXED: More reasonable timeout values based on environment
const DEFAULT_TIMEOUT = process.env.NODE_ENV === 'test'
    ? 10000  // 10 seconds for tests
    : parseInt(process.env.REQUEST_TIMEOUT) || 60000; // 60 seconds for production

const timeoutMiddleware = (timeout = DEFAULT_TIMEOUT) => (req, res, next) => {
    // Set a flag to track if response was sent
    let responseSent = false;
    const startTime = Date.now();

    // Create timeout handler with better error information
    const timeoutHandler = () => {
        if (!responseSent && !res.headersSent) {
            responseSent = true;
            const duration = Date.now() - startTime;

            logger.warn('Request timeout occurred', {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                duration: `${duration}ms`,
                timeout: `${timeout}ms`
            });

            const error = new ApiError(408, `Request timeout - Operation took longer than ${timeout}ms to complete`);
            next(error);
        }
    };

    // Set timeout for the request
    const requestTimeout = setTimeout(timeoutHandler, timeout);

    // Override res.send, res.json, and res.end to clear timeout
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    const clearTimeoutAndLog = () => {
        if (!responseSent) {
            responseSent = true;
            clearTimeout(requestTimeout);

            const duration = Date.now() - startTime;
            logger.debug('Request completed successfully', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                status: res.statusCode
            });
        }
    };

    res.send = function (...args) {
        clearTimeoutAndLog();
        return originalSend.apply(this, args);
    };

    res.json = function (...args) {
        clearTimeoutAndLog();
        return originalJson.apply(this, args);
    };

    res.end = function (...args) {
        clearTimeoutAndLog();
        return originalEnd.apply(this, args);
    };

    // Clean up on request close/abort
    req.on('close', () => {
        if (!responseSent) {
            responseSent = true;
            clearTimeout(requestTimeout);

            const duration = Date.now() - startTime;
            logger.info('Request closed by client', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`
            });
        }
    });

    req.on('aborted', () => {
        if (!responseSent) {
            responseSent = true;
            clearTimeout(requestTimeout);

            const duration = Date.now() - startTime;
            logger.info('Request aborted by client', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`
            });
        }
    });

    next();
};

module.exports = timeoutMiddleware;
