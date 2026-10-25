import ExcelJS from 'exceljs';

/**
 * Formats a currency number into Philippine Peso string (e.g. ₱ 1,234.56)
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a date into a clean readable string (e.g. April 26, 2025, 10:24 AM)
 */
function formatReportDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

/**
 * Builds the Inventory Intelligence worksheet matching the expected executive design
 */
function buildInventorySheet(workbook, data, options = {}) {
  const ws = workbook.addWorksheet('Inventory', {
    views: [{ showGridLines: true }]
  });

  const {
    branchName = 'All Branches',
    filterCategory = 'All',
    filterStatus = 'All',
    kpis = {}
  } = options;

  // Set explicit column widths
  ws.columns = [
    { key: 'col1', width: 6 },   // #
    { key: 'col2', width: 38 },  // Product Name
    { key: 'col3', width: 18 },  // Category
    { key: 'col4', width: 16 },  // Current Stock
    { key: 'col5', width: 16 },  // StockQty Sold
    { key: 'col6', width: 18 },  // Daily Sales Trend
    { key: 'col7', width: 16 },  // Days Remaining
    { key: 'col8', width: 16 }   // Status
  ];

  // 1. BANNER HEADER (Rows 1 to 3)
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    row.height = r === 2 ? 26 : 14;
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0E3A53' } // Deep Teal/Navy
      };
    }
  }

  // Left Title
  ws.mergeCells('A2:E2');
  const titleCell = ws.getCell('A2');
  titleCell.value = 'PC ALLEY  |  INVENTORY INTELLIGENCE REPORT';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Right Tagline
  ws.mergeCells('F2:H2');
  const tagCell = ws.getCell('F2');
  tagCell.value = 'Smarter Stock. Stronger Business.';
  tagCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF80E5FF' } };
  tagCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // 2. METADATA PILL BAR (Row 4)
  const row4 = ws.getRow(4);
  row4.height = 24;
  for (let c = 1; c <= 8; c++) {
    row4.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F7FB' }
    };
    row4.getCell(c).border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  ws.mergeCells('A4:C4');
  const meta1 = ws.getCell('A4');
  meta1.value = `📍 Branch: ${branchName}`;
  meta1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta1.alignment = { vertical: 'middle', indent: 1 };

  ws.mergeCells('D4:F4');
  const meta2 = ws.getCell('D4');
  const filterCatText = filterCategory && filterCategory !== 'All' ? filterCategory : 'All Categories';
  const filterStatText = filterStatus && filterStatus !== 'All' ? filterStatus : 'All Statuses';
  meta2.value = `🏷️ Filter: ${filterCatText}, ${filterStatText}`;
  meta2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta2.alignment = { vertical: 'middle' };

  ws.mergeCells('G4:H4');
  const meta3 = ws.getCell('G4');
  meta3.value = `📅 Generated: ${formatReportDate()}`;
  meta3.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta3.alignment = { vertical: 'middle', horizontal: 'right' };

  // Row 5: Spacer
  ws.getRow(5).height = 10;

  // 3. KPI SUMMARY CARDS CONTAINER (Rows 6 to 9)
  for (let r = 6; r <= 9; r++) {
    const row = ws.getRow(r);
    row.height = r === 6 ? 16 : r === 7 ? 24 : 12;
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
    }
  }

  // Border outline for KPI Box
  for (let c = 1; c <= 8; c++) {
    ws.getCell(6, c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    ws.getCell(9, c).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  }
  for (let r = 6; r <= 9; r++) {
    ws.getCell(r, 1).border = { ...ws.getCell(r, 1).border, left: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    ws.getCell(r, 8).border = { ...ws.getCell(r, 8).border, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  }

  // Left Title in Summary Box
  ws.mergeCells('A6:B6');
  const kpiTitle = ws.getCell('A6');
  kpiTitle.value = '📊 SUMMARY OVERVIEW';
  kpiTitle.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0E3A53' } };
  kpiTitle.alignment = { vertical: 'middle', indent: 1 };

  ws.mergeCells('A7:B8');
  const kpiSub = ws.getCell('A7');
  kpiSub.value = 'Key inventory and sales metrics at a glance';
  kpiSub.font = { name: 'Calibri', size: 8.5, color: { argb: 'FF64748B' } };
  kpiSub.alignment = { vertical: 'top', indent: 1 };

  // Metrics (Cols 3 to 8)
  const metricCards = [
    { col: 3, label: 'Total Unique SKUs', val: (kpis.totalSkus || data.length || 0).toLocaleString(), color: 'FF0E3A53' },
    { col: 4, label: 'In Stock Items', val: (kpis.inStock !== undefined ? kpis.inStock : data.filter(d => d.statusGroup === 'In Stock').length).toLocaleString(), color: 'FF027A48' },
    { col: 5, label: 'Out of Stock Items', val: (kpis.outOfStock !== undefined ? kpis.outOfStock : data.filter(d => d.statusGroup === 'Out of Stock').length).toLocaleString(), color: 'FFB42318' },
    { col: 6, label: 'Total Stock Quantity', val: (kpis.totalStock !== undefined ? kpis.totalStock : data.reduce((s, i) => s + (Number(i.stock) || 0), 0)).toLocaleString(), color: 'FF0E3A53' },
    { col: 7, label: 'Total Sales (Current Period)', val: formatCurrency(kpis.totalSales || 0), color: 'FF0E3A53' },
    { col: 8, label: 'Total Inventory Value', val: formatCurrency(kpis.totalInventoryValue || 0), color: 'FF0E3A53' }
  ];

  metricCards.forEach(m => {
    const lblCell = ws.getCell(6, m.col);
    lblCell.value = m.label;
    lblCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
    lblCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const valCell = ws.getCell(7, m.col);
    valCell.value = m.val;
    valCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: m.color } };
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Row 10: Spacer
  ws.getRow(10).height = 10;

  // 4. DATA TABLE HEADERS (Row 11)
  const headers = ['#', 'Product Name', 'Category', 'Current Stock', 'StockQty Sold', 'Daily Sales Trend', 'Days Remaining', 'Status'];
  const row11 = ws.getRow(11);
  row11.height = 24;
  headers.forEach((h, idx) => {
    const cell = row11.getCell(idx + 1);
    cell.value = h;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0E3A53' }
    };
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 1 ? 'left' : 'center', indent: idx === 1 ? 1 : 0 };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0E3A53' } },
      bottom: { style: 'medium', color: { argb: 'FF0A2540' } },
      left: { style: 'thin', color: { argb: 'FF1E4D6B' } },
      right: { style: 'thin', color: { argb: 'FF1E4D6B' } }
    };
  });

  // 5. DATA ROWS (Row 12+)
  data.forEach((item, index) => {
    const rowNum = 12 + index;
    const row = ws.getRow(rowNum);
    row.height = 20;
    const isEven = index % 2 === 1;
    const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    const pName = item.name || item['Product Name'] || '';
    const pCat = item.category || item['Category'] || '';
    const pStock = Number(item.stock !== undefined ? item.stock : item['Current Stock']) || 0;
    const pSold = Number(item.sold30 !== undefined ? item.sold30 : item['30-Day Sales']) || 0;
    const pTrend = item.dailySales !== undefined ? (Number(item.dailySales) > 0 ? `₱ ${Number(item.dailySales).toFixed(2)}` : '₱ 0.00') : (item['Daily Sales Trend'] || '₱ 0.00');
    const pDays = item.daysRemaining !== undefined ? item.daysRemaining : (item['Days Remaining'] || '--');
    const pStatus = item.statusGroup || item['Status'] || (pStock > 0 ? 'In Stock' : 'Out of Stock');

    const cellsData = [
      { col: 1, val: index + 1, align: 'center', font: { size: 9, color: { argb: 'FF64748B' } } },
      { col: 2, val: pName, align: 'left', font: { size: 9.5, bold: true, color: { argb: 'FF0F172A' } } },
      { col: 3, val: pCat, align: 'center', font: { size: 9, color: { argb: 'FF334155' } } },
      { col: 4, val: pStock, align: 'center', font: { size: 9.5, bold: true, color: { argb: 'FF0F172A' } } },
      { col: 5, val: pSold, align: 'center', font: { size: 9, color: { argb: 'FF334155' } } },
      { col: 6, val: pTrend, align: 'right', font: { size: 9, color: { argb: 'FF334155' } } },
      { col: 7, val: String(pDays), align: 'center', font: { size: 9, color: { argb: 'FF64748B' } } },
      { col: 8, val: pStatus, align: 'center', isBadge: true }
    ];

    cellsData.forEach(c => {
      const cell = row.getCell(c.col);
      cell.value = c.val;
      cell.alignment = { vertical: 'middle', horizontal: c.align, indent: c.align === 'left' ? 1 : 0 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (c.isBadge) {
        if (pStatus === 'In Stock') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEF7EC' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF03543F' } };
        } else if (pStatus === 'Out of Stock') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF9B1C1C' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFB45309' } };
        }
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { name: 'Calibri', ...c.font };
      }
    });
  });
}

/**
 * Builds the Stock Transfer History worksheet with matching design language
 */
function buildTransferHistorySheet(workbook, transfers = [], options = {}) {
  const ws = workbook.addWorksheet('Transfer History', {
    views: [{ showGridLines: true }]
  });

  const { branchName = 'All Branches' } = options;

  // Set explicit column widths
  ws.columns = [
    { key: 'col1', width: 6 },   // #
    { key: 'col2', width: 22 },  // Transfer #
    { key: 'col3', width: 14 },  // Date
    { key: 'col4', width: 22 },  // Source Branch
    { key: 'col5', width: 22 },  // Destination Branch
    { key: 'col6', width: 42 },  // Transferred Products & Quantities
    { key: 'col7', width: 12 },  // Total Units
    { key: 'col8', width: 18 },  // Dispatched By
    { key: 'col9', width: 15 },  // Status
    { key: 'col10', width: 26 }  // Notes
  ];

  // 1. BANNER HEADER (Rows 1 to 3)
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    row.height = r === 2 ? 26 : 14;
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0E3A53' } // Deep Teal/Navy
      };
    }
  }

  // Left Title
  ws.mergeCells('A2:F2');
  const titleCell = ws.getCell('A2');
  titleCell.value = 'PC ALLEY  |  STOCK TRANSFER HISTORY REPORT';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Right Tagline
  ws.mergeCells('G2:J2');
  const tagCell = ws.getCell('G2');
  tagCell.value = 'Inter-Branch Logistics & Inventory Movement';
  tagCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF80E5FF' } };
  tagCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // 2. METADATA PILL BAR (Row 4)
  const row4 = ws.getRow(4);
  row4.height = 24;
  for (let c = 1; c <= 10; c++) {
    row4.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F7FB' }
    };
    row4.getCell(c).border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  ws.mergeCells('A4:D4');
  const meta1 = ws.getCell('A4');
  meta1.value = `📍 Scope: ${branchName} Logistics Ledger`;
  meta1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta1.alignment = { vertical: 'middle', indent: 1 };

  ws.mergeCells('E4:G4');
  const meta2 = ws.getCell('E4');
  meta2.value = `🏷️ Total Records: ${transfers.length} Transfers`;
  meta2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta2.alignment = { vertical: 'middle' };

  ws.mergeCells('H4:J4');
  const meta3 = ws.getCell('H4');
  meta3.value = `📅 Generated: ${formatReportDate()}`;
  meta3.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  meta3.alignment = { vertical: 'middle', horizontal: 'right' };

  // Row 5: Spacer
  ws.getRow(5).height = 10;

  // 3. KPI OVERVIEW (Rows 6 to 9)
  for (let r = 6; r <= 9; r++) {
    const row = ws.getRow(r);
    row.height = r === 6 ? 16 : r === 7 ? 24 : 12;
    for (let c = 1; c <= 10; c++) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
    }
  }

  // Border outline for KPI Box
  for (let c = 1; c <= 10; c++) {
    ws.getCell(6, c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    ws.getCell(9, c).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  }
  for (let r = 6; r <= 9; r++) {
    ws.getCell(r, 1).border = { ...ws.getCell(r, 1).border, left: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    ws.getCell(r, 10).border = { ...ws.getCell(r, 10).border, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  }

  // Left Title in Summary Box
  ws.mergeCells('A6:C6');
  const kpiTitle = ws.getCell('A6');
  kpiTitle.value = '📦 TRANSFER LEDGER OVERVIEW';
  kpiTitle.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0E3A53' } };
  kpiTitle.alignment = { vertical: 'middle', indent: 1 };

  ws.mergeCells('A7:C8');
  const kpiSub = ws.getCell('A7');
  kpiSub.value = 'Comprehensive cross-branch dispatch & arrival history';
  kpiSub.font = { name: 'Calibri', size: 8.5, color: { argb: 'FF64748B' } };
  kpiSub.alignment = { vertical: 'top', indent: 1 };

  // Calculate transfer stats
  const completedCount = transfers.filter(t => t.status === 'Completed').length;
  const inTransitCount = transfers.filter(t => t.status === 'In-Transit').length;
  const pendingCount = transfers.filter(t => t.status === 'Pending').length;
  let totalUnits = 0;
  transfers.forEach(t => {
    const items = t.StockTransferItems || t.items || [];
    items.forEach(it => totalUnits += (Number(it.quantity) || 0));
  });

  const tMetrics = [
    { col: 4, label: 'Total Transfers', val: transfers.length.toLocaleString(), color: 'FF0E3A53' },
    { col: 5, label: 'Completed Transfers', val: completedCount.toLocaleString(), color: 'FF027A48' },
    { col: 6, label: 'In-Transit Transfers', val: inTransitCount.toLocaleString(), color: 'FF1E429F' },
    { col: 7, label: 'Pending Transfers', val: pendingCount.toLocaleString(), color: 'FFB45309' },
    { col: 8, label: 'Total Units Transferred', val: totalUnits.toLocaleString(), color: 'FF0E3A53' }
  ];

  tMetrics.forEach(m => {
    const lblCell = ws.getCell(6, m.col);
    lblCell.value = m.label;
    lblCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
    lblCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const valCell = ws.getCell(7, m.col);
    valCell.value = m.val;
    valCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: m.color } };
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Row 10: Spacer
  ws.getRow(10).height = 10;

  // 4. DATA TABLE HEADERS (Row 11)
  const tHeaders = ['#', 'Transfer #', 'Date', 'Source Branch', 'Destination Branch', 'Transferred Products & Quantities', 'Total Units', 'Dispatched By', 'Status', 'Notes'];
  const row11 = ws.getRow(11);
  row11.height = 24;
  tHeaders.forEach((h, idx) => {
    const cell = row11.getCell(idx + 1);
    cell.value = h;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0E3A53' }
    };
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: (idx === 1 || idx === 3 || idx === 4 || idx === 5 || idx === 9) ? 'left' : 'center', indent: (idx === 1 || idx === 3 || idx === 4 || idx === 5 || idx === 9) ? 1 : 0 };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0E3A53' } },
      bottom: { style: 'medium', color: { argb: 'FF0A2540' } },
      left: { style: 'thin', color: { argb: 'FF1E4D6B' } },
      right: { style: 'thin', color: { argb: 'FF1E4D6B' } }
    };
  });

  // 5. DATA ROWS (Row 12+)
  if (transfers.length === 0) {
    const row12 = ws.getRow(12);
    row12.height = 24;
    ws.mergeCells('A12:J12');
    const emptyCell = ws.getCell('A12');
    emptyCell.value = 'No stock transfer records found.';
    emptyCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
  } else {
    transfers.forEach((t, index) => {
      const rowNum = 12 + index;
      const row = ws.getRow(rowNum);
      row.height = 22;
      const isEven = index % 2 === 1;
      const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

      const transferNum = t.transferNumber || `TR-${String(t.id).padStart(4, '0')}`;
      const transferDate = t.transferDate ? String(t.transferDate).split('T')[0] : (t.createdAt ? String(t.createdAt).split('T')[0] : '--');
      const srcName = t.SourceBranch?.name || `Branch #${t.fromBranchId || '--'}`;
      const destName = t.DestBranch?.name || `Branch #${t.toBranchId || '--'}`;
      
      const items = t.StockTransferItems || t.items || [];
      const itemsText = items.map(it => {
        const pName = it.Product?.name || it.name || `Product #${it.productId || ''}`;
        return `${pName} (${it.quantity || 1} units)`;
      }).join(', ') || 'No items itemized';
      
      const tUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      const dispatched = t.dispatchedBy || 'System';
      const status = t.status || 'Pending';
      const notes = t.notes || '--';

      const cellsData = [
        { col: 1, val: index + 1, align: 'center', font: { size: 9, color: { argb: 'FF64748B' } } },
        { col: 2, val: transferNum, align: 'left', font: { size: 9.5, bold: true, color: { argb: 'FF0E3A53' } } },
        { col: 3, val: transferDate, align: 'center', font: { size: 9, color: { argb: 'FF334155' } } },
        { col: 4, val: srcName, align: 'left', font: { size: 9, color: { argb: 'FF0F172A' } } },
        { col: 5, val: destName, align: 'left', font: { size: 9, color: { argb: 'FF0F172A' } } },
        { col: 6, val: itemsText, align: 'left', font: { size: 9, color: { argb: 'FF334155' } } },
        { col: 7, val: tUnits, align: 'center', font: { size: 9.5, bold: true, color: { argb: 'FF0F172A' } } },
        { col: 8, val: dispatched, align: 'center', font: { size: 9, color: { argb: 'FF64748B' } } },
        { col: 9, val: status, align: 'center', isBadge: true },
        { col: 10, val: notes, align: 'left', font: { size: 8.5, color: { argb: 'FF64748B' } } }
      ];

      cellsData.forEach(c => {
        const cell = row.getCell(c.col);
        cell.value = c.val;
        cell.alignment = { vertical: 'middle', horizontal: c.align, indent: c.align === 'left' ? 1 : 0 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (c.isBadge) {
          if (status === 'Completed') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEF7EC' } };
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF03543F' } };
          } else if (status === 'In-Transit') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1EFFE' } };
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E429F' } };
          } else if (status === 'Pending') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF9B1C1C' } };
          }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.font = { name: 'Calibri', ...c.font };
        }
      });
    });
  }
}

/**
 * Builds a standard upgraded sheet for general reports
 */
function buildGenericSheet(workbook, data, sheetName = 'Data', options = {}) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  const { title = 'PC ALLEY ERP REPORT', subtitle = '', summary = null } = options;

  if (!data || data.length === 0) {
    ws.addRow([title]);
    ws.addRow(['No data available for export.']);
    return;
  }

  const headers = Object.keys(data[0]);
  const numCols = Math.max(headers.length, 6);

  // Set default column widths based on content
  const colWidths = headers.map(h => Math.max(h.length + 4, 14));
  data.forEach(item => {
    headers.forEach((h, idx) => {
      const valStr = String(item[h] ?? '');
      colWidths[idx] = Math.max(colWidths[idx], Math.min(valStr.length + 4, 50));
    });
  });
  ws.columns = colWidths.map(w => ({ width: w }));

  // 1. BANNER
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    row.height = r === 2 ? 26 : 14;
    for (let c = 1; c <= numCols; c++) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0E3A53' }
      };
    }
  }

  ws.mergeCells(2, 1, 2, Math.floor(numCols * 0.65));
  const titleCell = ws.getCell('A2');
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws.mergeCells(2, Math.floor(numCols * 0.65) + 1, 2, numCols);
  const tagCell = ws.getCell(2, Math.floor(numCols * 0.65) + 1);
  tagCell.value = 'Smarter Stock. Stronger Business.';
  tagCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF80E5FF' } };
  tagCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // 2. METADATA
  const row4 = ws.getRow(4);
  row4.height = 24;
  for (let c = 1; c <= numCols; c++) {
    row4.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FB' } };
    row4.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  }
  const metaCell = ws.getCell('A4');
  metaCell.value = subtitle ? `${subtitle}  |  Generated: ${formatReportDate()}` : `Generated: ${formatReportDate()}`;
  metaCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  metaCell.alignment = { vertical: 'middle', indent: 1 };

  let startRow = 6;

  // 3. SUMMARY SECTION (if provided)
  if (summary && typeof summary === 'object') {
    const summaryKeys = Object.keys(summary);
    const summaryRow1 = ws.getRow(startRow);
    const summaryRow2 = ws.getRow(startRow + 1);
    summaryRow1.height = 16;
    summaryRow2.height = 22;

    for (let r = startRow; r <= startRow + 1; r++) {
      for (let c = 1; c <= numCols; c++) {
        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }

    summaryKeys.slice(0, numCols).forEach((key, idx) => {
      const c = idx + 1;
      const lblCell = ws.getCell(startRow, c);
      lblCell.value = key;
      lblCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
      lblCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const valCell = ws.getCell(startRow + 1, c);
      valCell.value = String(summary[key]);
      valCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0E3A53' } };
      valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    startRow += 3;
  }

  // 4. HEADERS
  const headerRow = ws.getRow(startRow);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E3A53' } };
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0E3A53' } },
      bottom: { style: 'medium', color: { argb: 'FF0A2540' } },
      left: { style: 'thin', color: { argb: 'FF1E4D6B' } },
      right: { style: 'thin', color: { argb: 'FF1E4D6B' } }
    };
  });

  // 5. ROWS
  data.forEach((item, index) => {
    const rowNum = startRow + 1 + index;
    const row = ws.getRow(rowNum);
    row.height = 20;
    const isEven = index % 2 === 1;
    const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    headers.forEach((h, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const val = item[h];
      cell.value = val !== undefined && val !== null ? val : '';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: typeof val === 'number' ? 'right' : 'left', indent: typeof val === 'number' ? 0 : 1 };
    });
  });
}

/**
 * Exports data to an Excel file (.xlsx) with modern luxury UI design
 * Supports multi-sheet export (Inventory + Transfer History) and backward compatibility
 * @param {Array} data - Array of objects representing the rows
 * @param {string} fileName - Name of the file (without extension)
 * @param {string} sheetName - Name of the primary worksheet
 * @param {Object} options - Formatting and multi-sheet options
 */
export const exportToExcel = async (data, fileName = 'Report', sheetName = 'Data', options = {}) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PC Alley Management System';
    workbook.created = new Date();

    if (options.isStockReport) {
      // 1. Build Inventory Intelligence Sheet (Image 2 design)
      buildInventorySheet(workbook, data, options);

      // 2. Build Transfer History Sheet if transfers provided
      if (options.transfers && Array.isArray(options.transfers)) {
        buildTransferHistorySheet(workbook, options.transfers, options);
      }
    } else {
      // Generic Sheet with upgraded design system
      buildGenericSheet(workbook, data, sheetName, options);
    }

    // Generate binary buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Trigger browser download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};
