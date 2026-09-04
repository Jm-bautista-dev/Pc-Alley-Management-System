const http = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

// Global exception & rejection handlers to prevent abrupt process crashes
process.on('uncaughtException', (err) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [CRITICAL UNCAUGHT EXCEPTION]\n${err?.stack || err}\n\n`;
  console.error(logMsg);
  try {
    fs.appendFileSync(path.join(logsDir, 'frontend-error.log'), logMsg);
  } catch (e) {}
});

process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [UNHANDLED PROMISE REJECTION]\nReason: ${reason?.stack || reason}\n\n`;
  console.error(logMsg);
  try {
    fs.appendFileSync(path.join(logsDir, 'frontend-error.log'), logMsg);
  } catch (e) {}
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Direct lightweight server-level health check (fast-path for load balancers & LiteSpeed)
      if (pathname === '/api/health' || pathname === '/health') {
        const memory = process.memoryUsage();
        const healthPayload = JSON.stringify({
          status: 'ok',
          service: 'pc-alley-frontend',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          memory: {
            rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
            heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
            heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          },
          nodeVersion: process.version,
          env: process.env.NODE_ENV || 'production'
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Health-Check': 'pc-alley-frontend-ok'
        });
        res.end(healthPayload);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error(`[HTTP SERVER ERROR] ${req.method} ${req.url}:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error: Handled by server wrapper');
      }
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port} [NODE_ENV=${process.env.NODE_ENV || 'production'}]`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forcefully terminating after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}).catch((err) => {
  console.error('[CRITICAL] Error starting Next.js custom server:', err);
  process.exit(1);
});
