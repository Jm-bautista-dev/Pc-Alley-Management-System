// Utility functions for processing dashboard analytics
// Compatible with both the new Sale model (totalAmount, SaleItems)
// and legacy Order model (total_amount, OrderItems)

/**
 * Limit data to a certain amount of recent records to prevent UI lag.
 */
export const limitData = (data, maxRecords = 1000) => {
  if (!data || !Array.isArray(data)) return [];
  return data.slice(0, Math.min(data.length, maxRecords));
};

/**
 * Normalise a sale/order record to a common shape so the rest of
 * the helpers work regardless of which model produced the record.
 */
const normalise = (order) => ({
  totalAmount:  parseFloat(order.totalAmount  ?? order.total_amount ?? 0),
  createdAt:    order.createdAt,
  customerName: order.customerName ?? order.customer_name ?? '',
  items:        order.SaleItems ?? order.OrderItems ?? []
});

/**
 * Extract Key Performance Indicators (KPIs)
 */
export const getKPIs = (salesHistory, inventory) => {
  let totalRevenue = 0;
  let totalProfit  = 0;
  const uniqueCustomers = new Set();

  salesHistory.forEach(raw => {
    const order = normalise(raw);
    totalRevenue += order.totalAmount;
    totalProfit  += order.totalAmount * 0.30;
    if (order.customerName) uniqueCustomers.add(order.customerName);
  });

  const lowStockThreshold = 10;
  // Ensure inventory is an array; handle cases where API returns { data: [] } or similar envelope
  const inventoryArray = Array.isArray(inventory) ? inventory : (inventory?.data ?? []);
  const lowStockCount = inventoryArray.filter(
    item => item.quantity <= (item.low_stock_threshold || lowStockThreshold)
  ).length;

  return {
    revenue:   totalRevenue,
    profit:    totalProfit,
    orders:    salesHistory.length,
    customers: uniqueCustomers.size,
    lowStock:  lowStockCount
  };
};

/**
 * Process monthly trend data (Revenue & Profit by calendar month)
 * and dynamic trends based on the current filter.
 */
export const getTrendData = (salesHistory, filterType = "30", startDate = null, endDate = null) => {
  const revenueByMonth = new Array(12).fill(0);
  const profitByMonth  = new Array(12).fill(0);
  const ordersByMonth  = new Array(12).fill(0);

  salesHistory.forEach(raw => {
    const order = normalise(raw);
    const month = new Date(order.createdAt).getMonth();
    revenueByMonth[month] += order.totalAmount;
    profitByMonth[month]  += order.totalAmount * 0.30;
    ordersByMonth[month]  += 1;
  });

  // Dynamic grouping based on filters
  let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let revenue = [...revenueByMonth];
  let profit = [...profitByMonth];

  if (filterType === "1") {
    // 1 Day (Today): Group by hour (24-hour cycle)
    labels = Array.from({ length: 24 }, (_, i) => {
      const h = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      return `${h} ${ampm}`;
    });
    revenue = new Array(24).fill(0);
    profit = new Array(24).fill(0);

    salesHistory.forEach(raw => {
      const order = normalise(raw);
      const hour = new Date(order.createdAt).getHours();
      revenue[hour] += order.totalAmount;
      profit[hour] += order.totalAmount * 0.30;
    });
  } else if (filterType === "7" || filterType === "30") {
    // 7 Days / 30 Days: Group by day date
    const dayCount = filterType === "7" ? 7 : 30;
    labels = [];
    revenue = [];
    profit = [];
    const dateMap = {};

    const now = new Date();
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const key = d.toISOString().slice(0, 10);
      labels.push(dateStr);
      dateMap[key] = labels.length - 1;
      revenue.push(0);
      profit.push(0);
    }

    salesHistory.forEach(raw => {
      const order = normalise(raw);
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      if (dateMap[key] !== undefined) {
        const idx = dateMap[key];
        revenue[idx] += order.totalAmount;
        profit[idx] += order.totalAmount * 0.30;
      }
    });
  } else if (filterType === "custom" && startDate && endDate) {
    // Custom date range: group by day if range <= 45 days, otherwise group by month
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    const diffTime = Math.abs(dEnd - dStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 45) {
      labels = [];
      revenue = [];
      profit = [];
      const dateMap = {};

      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(dStart);
        d.setDate(dStart.getDate() + i);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const key = d.toISOString().slice(0, 10);
        labels.push(dateStr);
        dateMap[key] = labels.length - 1;
        revenue.push(0);
        profit.push(0);
      }

      salesHistory.forEach(raw => {
        const order = normalise(raw);
        const key = new Date(order.createdAt).toISOString().slice(0, 10);
        if (dateMap[key] !== undefined) {
          const idx = dateMap[key];
          revenue[idx] += order.totalAmount;
          profit[idx] += order.totalAmount * 0.30;
        }
      });
    }
  }

  return { revenueByMonth, profitByMonth, ordersByMonth, labels, revenue, profit };
};

/**
 * Calculate Product Burn Rate (Days Remaining until stock-out).
 * Compares 30-day velocity with current stock.
 */
export const getBurnRates = (salesHistory, inventory) => {
  // Ensure inventory is an array – API may return { data: [...] } or undefined
  if (!Array.isArray(inventory)) {
    if (inventory && typeof inventory === 'object' && Array.isArray(inventory.data)) {
      inventory = inventory.data;
    } else {
      inventory = [];
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const productVelocity = {};

  salesHistory.forEach(raw => {
    const order = normalise(raw);
    const orderDate = new Date(order.createdAt);
    if (orderDate >= thirtyDaysAgo && order.items.length > 0) {
      order.items.forEach(item => {
        // Support both new SaleItem (productId) and old OrderItem (product_id)
        const pId = item.productId ?? item.product_id;
        if (pId) productVelocity[pId] = (productVelocity[pId] || 0) + (item.quantity || 0);
      });
    }
  });

  const burnRates = [];
  inventory.forEach(item => {
    const stock = item.quantity;
    const velocity = productVelocity[item.product_id] || 0;
    const daily = velocity / 30;

    if (daily > 0) {
      const daysRemaining = Math.max(0, Math.ceil(stock / daily));
      let status = 'safe';
      if (daysRemaining <= 5) status = 'critical';
      else if (daysRemaining <= 10) status = 'warning';

      burnRates.push({
        id: item.product_id,
        name: item.Product?.name || 'Unknown Product',
        stock,
        dailyVelocity: daily.toFixed(1),
        daysRemaining,
        status
      });
    }
  });

  return burnRates.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5);
};

/**
 * Compute Cross-Selling Correlation Matrix from local sales history.
 * Returns data for horizontal bar chart.
 */
export const getCrossSellCorrelations = (salesHistory) => {
  const basketPairs = {};
  let validBaskets = 0;

  salesHistory.forEach(raw => {
    const order = normalise(raw);
    if (order.items.length > 1) {
      validBaskets++;
      const cats = Array.from(new Set(
        order.items
          .map(item => item.Product?.Category?.name ?? item.productName ?? null)
          .filter(Boolean)
      ));
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          const pair = [cats[i], cats[j]].sort().join(' + ');
          basketPairs[pair] = (basketPairs[pair] || 0) + 1;
        }
      }
    }
  });

  return Object.entries(basketPairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => ({
      pair,
      count,
      percentage: Math.round((count / (validBaskets || 1)) * 100)
    }));
};

/**
 * Advanced Product Performance & Dead Stock analysis.
 */
export const getProductPerformance = (salesHistory, inventory, correlations) => {
  // Ensure inventory is an array – API may return { data: [...] } or undefined
  if (!Array.isArray(inventory)) {
    if (inventory && typeof inventory === 'object' && Array.isArray(inventory.data)) {
      inventory = inventory.data;
    } else {
      inventory = [];
    }
  }

  const today        = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const productSales    = {};
  const productLastSold = {};

  salesHistory.forEach(raw => {
    const order     = normalise(raw);
    const orderDate = new Date(order.createdAt);

    order.items.forEach(item => {
      const pId = item.productId ?? item.product_id;
      if (!pId) return;

      if (!productSales[pId]) productSales[pId] = { sold30: 0, sold7: 0 };
      if (!productLastSold[pId] || orderDate > productLastSold[pId]) {
        productLastSold[pId] = orderDate;
      }

      if (orderDate >= thirtyDaysAgo) {
        productSales[pId].sold30 += item.quantity || 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (orderDate >= sevenDaysAgo) productSales[pId].sold7 += item.quantity || 0;
      }
    });
  });

  // Star products
  const starProducts = Object.entries(productSales)
    .map(([pId, data]) => {
      const inv     = inventory.find(i => String(i.product_id) === String(pId));
      const product = inv?.Product;
      const name    = product?.name || 'Unknown';
      const cat     = product?.Category?.name || '';
      const dailyVelocity = (data.sold30 / 30).toFixed(1);
      const weeklyTrend   = data.sold7 > data.sold30 / 4 ? '↑ Trending Up' : '↓ Cooling';
      let insight = 'High velocity baseline.';
      const rel = correlations?.find(c => c.pair.includes(cat));
      if (rel && rel.percentage > 30) {
        insight = `Bundled with ${rel.pair.replace(cat, '').replace('+', '').trim()} (${rel.percentage}%).`;
      }
      return { name, sold: data.sold30, dailyVelocity, weeklyTrend, insight };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 3);

  // Dead stock
  const deadStock = inventory
    .filter(item => {
      const sold = productSales[item.product_id]?.sold30 || 0;
      const ageDays = (today - new Date(item.Product?.createdAt || today)) / 86400000;
      return sold === 0 && item.quantity > 0 && ageDays >= 30;
    })
    .map(item => {
      const lastSold    = productLastSold[item.product_id];
      const daysStagnant = lastSold
        ? Math.floor((today - lastSold) / 86400000)
        : 90;

      let severity = 'Slow Moving';
      let tagColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      if (daysStagnant >= 60) {
        severity = 'Dead Stock';
        tagColor = 'bg-red-500/10 text-red-500 border-red-500/20';
      } else if (daysStagnant >= 30) {
        severity = 'At Risk';
        tagColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      }

      const confidence = Math.min(99, 60 + daysStagnant * 0.4);
      return {
        name:  item.Product?.name || 'Unknown',
        stock: item.quantity,
        daysStagnant,
        severity,
        tagColor,
        insight: `Confidence: ${Math.round(confidence)}% based on ${daysStagnant}d static holding.`
      };
    })
    .sort((a, b) => b.daysStagnant - a.daysStagnant)
    .slice(0, 5);

  return { starProducts, deadStock };
};
