const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./db');
require('./models');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000,http://localhost:3001'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
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
app.use('/api/restock-requests', require('./routes/restockRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// New Routes
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseRoutes'));
app.use('/api/stock-transfers', require('./routes/transferRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

app.get('/', (req, res) => {
  res.send('PC Alley API is running...');
});

sequelize
  .sync({ force: false })
  .then(() => {
    console.log('--------------------------------------------------');
    console.log('DATABASE: Synced successfully.');

    const server = app.listen(PORT, () => {
      console.log(`SERVER: Running on http://localhost:${PORT}`);
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
  })
  .catch((err) => {
    console.log('--------------------------------------------------');
    console.log('DATABASE ERROR: Could not connect to MySQL.');
    console.log('Tip: Please ensure XAMPP is open and MySQL is STARTED.');
    console.log('--------------------------------------------------');
    console.error('Technical Details:', err.message);
  });
