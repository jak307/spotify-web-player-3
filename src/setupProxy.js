const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        '/auth/**', 
        createProxyMiddleware({ 
            target: 'http://localhost:5000'
        })
    );
    app.use(
        '/top-tracks', 
        createProxyMiddleware({ 
            target: 'http://localhost:5000'
        })
    );
    app.use(
        '/recommendations', 
        createProxyMiddleware({ 
            target: 'http://localhost:5000'
        })
    );
    app.use(
        '/genre-seeds',
        createProxyMiddleware({
            target: 'http://localhost:5000'
        })
    );
};
