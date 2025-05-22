const { ApiError } = require('../utils/ApiError');

const DEFAULT_TIMEOUT = process.env.NODE_ENV === 'test' ? 5000 : 30000;

const timeoutMiddleware = (timeout = DEFAULT_TIMEOUT) => (req, res, next) => {
    // Set timeout for the request
    req.setTimeout(timeout, () => {
        const error = new ApiError(408, 'Request Timeout');
        next(error);
    });

    // Set timeout for the response
    res.setTimeout(timeout, () => {
        const error = new ApiError(503, 'Service Unavailable - Response Timeout');
        next(error);
    });

    next();
};

module.exports = timeoutMiddleware;
