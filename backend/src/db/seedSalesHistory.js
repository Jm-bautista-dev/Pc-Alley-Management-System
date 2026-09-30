const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../db');
const { Sale, SaleItem, Customer, Branch, User } = require('../models');

// Simple CSV parser for quoted CSV
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    
    const row = [];
    let insideQuotes = false;
    let field = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(field);
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseAmount(amtStr) {
  if (!amtStr) return 0.0;
  // e.g. "Php 1,500.000" or "Php 22,139.850"
  const clean = amtStr.replace(/Php\s*/i, '').replace(/,/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0.0 : parseFloat(val.toFixed(2));
}

function parseDate(dateStr) {
  // e.g. "09/24/2026 18:57" -> Date object
  if (!dateStr) return new Date();
  const parts = dateStr.trim().split(' ');
  if (parts.length >= 2) {
    const [m, d, y] = parts[0].split('/').map(n => parseInt(n, 10));
    const [hh, mm] = parts[1].split(':').map(n => parseInt(n, 10));
    if (m && d && y) {
      return new Date(y, m - 1, d, hh || 0, mm || 0, 0);
    }
  }
  return new Date(dateStr);
}

async function runSeed() {
  console.log('--- STARTING STORE SALES HISTORY SEED ---');
  await sequelize.authenticate();
  console.log('Database connected successfully.');

  const csvPath = path.join(__dirname, 'raw_sales_data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);

  // Fetch branches
  const branches = await Branch.findAll();
  const branchMap = {};
  for (const b of branches) {
    const nameLower = b.name.toLowerCase();
    if (nameLower.includes('rosa')) branchMap['sta.rosa'] = b.id;
    if (nameLower.includes('calamba')) branchMap['calamba'] = b.id;
    if (nameLower.includes('cruz')) branchMap['sta.cruz'] = b.id;
  }
  console.log('Branch mapping:', branchMap);

  // Default staff by branch
  const staffByBranch = {
    1: 5, // Sta Rosa
    2: 3, // Calamba
    3: 11 // Sta Cruz
  };

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    if (row.length < 10) continue;
    const action = row[0];
    const dateStr = row[1];
    const invoiceNo = row[2];
    const customerName = row[3];
    const contactNumber = row[4];
    const location = row[5];
    const paymentStatus = row[6];
    const paymentMethod = row[7];
    const totalAmountStr = row[8];
    const totalPaidStr = row[9];
    const totalItemsStr = row[13];
    const addedBy = row[14];
    const sellNote = row[15];

    // Skip headers or summary rows
    if (action === 'Action' || dateStr === 'Date' || invoiceNo === 'Invoice No.' || action.startsWith('Total:') || (customerName && customerName.startsWith('Total:'))) continue;
    if (!invoiceNo || !invoiceNo.trim() || invoiceNo.toLowerCase().includes('invoice')) continue;

    // Determine branch
    let branchId = 1;
    const locLower = (location || '').toLowerCase();
    if (locLower.includes('calamba')) {
      branchId = branchMap['calamba'] || 2;
    } else if (locLower.includes('cruz')) {
      branchId = branchMap['sta.cruz'] || 3;
    } else {
      branchId = branchMap['sta.rosa'] || 1;
    }

    const totalAmount = parseAmount(totalAmountStr);
    const totalPaid = parseAmount(totalPaidStr) || totalAmount;
    const totalItems = parseInt(parseFloat(totalItemsStr || '1'), 10) || 1;
    const createdAt = parseDate(dateStr);
    const staffId = staffByBranch[branchId] || 1;
    const staffName = (addedBy && addedBy.trim()) ? addedBy.trim() : `cashier branch ${branchId}`;
    const custName = (customerName && customerName.trim()) ? customerName.trim() : 'Walk-in Customer';
    const cleanPhone = (contactNumber && contactNumber.trim() && !contactNumber.includes('****')) ? contactNumber.trim() : null;

    // Check if customer already exists or create
    let customerId = null;
    if (custName !== 'Walk-in Customer') {
      let customer = await Customer.findOne({ where: { name: custName, branchId } });
      if (!customer) {
        customer = await Customer.create({
          name: custName,
          phone: cleanPhone,
          branchId,
          totalSpent: totalAmount,
          totalOrders: 1
        });
      } else {
        customer.totalSpent = parseFloat((parseFloat(customer.totalSpent || 0) + totalAmount).toFixed(2));
        customer.totalOrders = (customer.totalOrders || 0) + 1;
        if (cleanPhone && !customer.phone) customer.phone = cleanPhone;
        await customer.save();
      }
      customerId = customer.id;
    }

    // Check if sale already exists
    const existingSale = await Sale.findOne({ where: { invoiceNumber: invoiceNo.trim() } });
    if (existingSale) {
      skippedCount++;
      continue;
    }

    const saleId = uuidv4();
    const newSale = await Sale.create({
      id: saleId,
      invoiceNumber: invoiceNo.trim(),
      customerId,
      customerName: custName,
      branchId,
      staffId,
      staffName,
      totalAmount,
      product_amount: totalAmount,
      service_amount: 0.00,
      sale_type: 'product',
      paymentMethod: (paymentMethod || 'cash').toLowerCase().includes('gcash') ? 'gcash' : 'cash',
      amountPaid: totalPaid,
      changeAmount: 0.00,
      status: 'completed',
      notes: (sellNote && sellNote.trim()) ? sellNote.trim() : null,
      createdAt,
      updatedAt: createdAt
    });

    // Create SaleItem
    const itemUnitPrice = totalItems > 0 ? parseFloat((totalAmount / totalItems).toFixed(2)) : totalAmount;
    await SaleItem.create({
      id: uuidv4(),
      saleId: newSale.id,
      item_type: 'product',
      productId: null,
      productName: `Sales Item (${invoiceNo.trim()})`,
      productSku: `SKU-${invoiceNo.trim()}`,
      quantity: totalItems,
      unitPrice: itemUnitPrice,
      subtotal: totalAmount,
      createdAt,
      updatedAt: createdAt
    });

    insertedCount++;
  }

  console.log(`--- SEED COMPLETE ---`);
  console.log(`Inserted: ${insertedCount} sales records`);
  console.log(`Skipped (already exists): ${skippedCount} sales records`);
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seeder finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}

module.exports = runSeed;
