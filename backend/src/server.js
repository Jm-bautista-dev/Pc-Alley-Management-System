const express = require('express');
const cors = require('cors');
// Force nodemon reload to pick up new .env variables (Reloaded: 2026-06-29)
require('dotenv').config();
const sequelize = require('./db');
require('./models');
const migrateUsers = require('./db/migrateUsers');
const migrateSchema = require('./db/migrateSchema');
const syncExistingImages = require('./db/syncExistingImages');
const backfillSkus = require('./db/backfillSkus');
const cleanProductionData = require('./db/cleanProductionData');
const cookieParser = require('./middleware/cookieParser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://pcalley.shop',
  'https://www.pcalley.shop',
  'https://api.pcalley.shop'
];

const envOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === 'pcalley.shop' || url.hostname.endsWith('.pcalley.shop') || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
  } catch (e) {}
  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-access-token',
    'x-auth-token',
    'token',
    'x-token',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser);

// ── Security: Prevent API responses from being cached ──
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

const UPLOADS_PATH = path.join(__dirname, '../uploads');
const PRODUCTS_UPLOADS_PATH = path.join(UPLOADS_PATH, 'products');

// Smart static handler for product images with automatic variant fallback
app.get('/uploads/products/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const requestedFile = path.join(PRODUCTS_UPLOADS_PATH, filename);

  // Security check: prevent directory traversal
  const rel = path.relative(PRODUCTS_UPLOADS_PATH, requestedFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return res.status(403).send('Forbidden');
  }

  // 1. If exact requested file exists on disk, serve it
  if (fs.existsSync(requestedFile)) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(requestedFile);
  }

  // 2. If requested file doesn't exist, try finding an existing variant
  if (filename.endsWith('.webp')) {
    const match = filename.match(/^(product_\d+_[a-z0-9]+)/i);
    const baseName = match ? match[1] : filename.replace(/(_original|_medium|_thumbnail)?\.webp$/i, '');
    const variants = [
      `${baseName}.webp`,
      `${baseName}_medium.webp`,
      `${baseName}_original.webp`,
      `${baseName}_thumbnail.webp`
    ];

    for (const variant of variants) {
      const variantPath = path.join(PRODUCTS_UPLOADS_PATH, variant);
      if (fs.existsSync(variantPath)) {
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(variantPath);
      }
    }
  }

  // 3. Not found
  return res.status(404).json({ error: 'Product image not found' });
});

app.use('/uploads', express.static(UPLOADS_PATH));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Payload:', req.body);
  }
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/restock-requests', require('./routes/restockRoutes'));
app.use('/api/product-requests', require('./routes/productRequestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// New Routes
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseRoutes'));
app.use('/api/stock-transfers', require('./routes/transferRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/warranties', require('./routes/warrantyRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bundles', require('./routes/bundleRoutes'));

app.get('/', (req, res) => {
  res.send('PC Alley API is running...');
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(`[SERVER] Unhandled error for ${req.method} ${req.originalUrl}:`, err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for socket origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-access-token',
      'x-auth-token',
      'token',
      'x-token',
      'Accept',
      'Origin',
      'X-Requested-With'
    ],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const server = httpServer.listen(PORT, () => {
  console.log(`SERVER: Running on http://localhost:${PORT} (with WebSockets)`);
  console.log(`ENV: JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES (' + process.env.JWT_SECRET.substring(0, 4) + '...)' : 'NO'}`);
  console.log('--------------------------------------------------');
});

server.on('error', (err) => {
  console.log('--------------------------------------------------');
  if (err.code === 'EADDRINUSE') {
    console.log(`SERVER ERROR: Port ${PORT} is already in use.`);
  } else {
    console.log('SERVER ERROR: Failed to start the API server.');
  }
  console.log('--------------------------------------------------');
  console.error('Technical Details:', err.message);
  process.exit(1);
});

// Run database connection and migrations asynchronously
(async () => {
  try {
    await sequelize.authenticate();
    console.log('DATABASE: Connected to MySQL successfully.');
    await sequelize.sync({ force: false });
    await migrateUsers();
    await migrateSchema();
    await syncExistingImages();
    await backfillSkus();
    await cleanProductionData();
    console.log('DATABASE: Schema synced and migrations completed.');
  } catch (err) {
    console.error('--------------------------------------------------');
    console.error('DATABASE ERROR: Could not connect or sync with MySQL.');
    console.error(`Config -> Host: ${process.env.DB_HOST || '127.0.0.1'}, Port: ${process.env.DB_PORT || 3306}, DB: ${process.env.DB_NAME || 'pc_alley_db'}, User: ${process.env.DB_USER || 'root'}`);
    console.error('Technical Details:', err.message || err);
    console.error('--------------------------------------------------');
  }
})();

module.exports = app;

