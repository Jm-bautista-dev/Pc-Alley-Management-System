import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file (.xlsx) with professional formatting
 * @param {Array} data - Array of objects representing the rows
 * @param {string} fileName - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} options - Optional formatting options (title, subtitle, summary)
 */
export const exportToExcel = (data, fileName = 'Report', sheetName = 'Data', options = {}) => {
  try {
    const { title = 'PC ALLEY ERP REPORT', subtitle = '', summary = null } = options;
    
    // Prepare rows for the worksheet
    const rows = [];
    
    // 1. Add Title & Header Info
    rows.push([title]);
    if (subtitle) rows.push([subtitle]);
    rows.push([`Generated on: ${new Date().toLocaleString()}`]);
    rows.push([]); // Spacer

    // 2. Add Summary Section if provided
    if (summary) {
      rows.push(['SUMMARY OVERVIEW']);
      Object.entries(summary).forEach(([key, value]) => {
        rows.push([key, value]);
      });
      rows.push([]); // Spacer
    }

    // 3. Add Table Headers and Data
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      rows.push(headers);
      
      data.forEach(item => {
        rows.push(Object.values(item));
      });
    }

    // Create a worksheet from the rows array
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    // 4. Adjust Column Widths (Auto-fit)
    const colWidths = [];
    rows.forEach(row => {
      row.forEach((cell, i) => {
        const value = cell ? cell.toString() : '';
        colWidths[i] = Math.max(colWidths[i] || 10, value.length + 2);
      });
    });
    worksheet['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) })); // Cap at 50 chars

    // 5. Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Save to file
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};
