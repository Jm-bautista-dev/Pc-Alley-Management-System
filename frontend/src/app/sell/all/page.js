"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Tag,
  CreditCard,
  Banknote,
  Printer,
  ChevronLeft,
  Calendar,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { exportToExcel } from "@/lib/excelExport";
import { useTheme } from "@/context/ThemeContext";
import { apiUrl } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────
// Thermal Receipt Template (80mm width)
// ─────────────────────────────────────────────────────────────────
function ThermalReceiptTemplate({ receipt }) {
  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.12;
  const grandTotal = subtotal + tax;

  return (
    <div className="w-[300px] mx-auto p-4 bg-white text-black font-mono text-[11px] leading-relaxed select-text">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-base font-black tracking-widest">PC ALLEY</h2>
        <p className="text-[10px] mt-0.5 uppercase">Computer Parts & Accessories</p>
        <p className="text-[10px] uppercase font-bold mt-1">Branch: {receipt.Branch?.name || "PC Alley Main"}</p>
        {receipt.Branch?.location && <p className="text-[9px] text-gray-600 uppercase mt-0.5">{receipt.Branch.location}</p>}
        {receipt.Branch?.phone && <p className="text-[9px] text-gray-600 mt-0.5">Tel: {receipt.Branch.phone}</p>}
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Transaction Metadata */}
      <div className="space-y-1 text-[10px] text-left">
        <p><span className="font-bold">Receipt ID:</span> {receipt.invoiceNumber || receipt.id}</p>
        <p><span className="font-bold">Date:</span> {new Date(receipt.createdAt).toLocaleString()}</p>
        <p><span className="font-bold">Cashier:</span> {receipt.staffName || (receipt.User ? receipt.User.full_name : "Cashier")}</p>
        <p><span className="font-bold">Customer:</span> {receipt.customerName || receipt.customer_name || "Walk-in Customer"}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Item List */}
      <table className="w-full text-[10px] text-left border-collapse">
        <thead>
          <tr className="border-b border-dashed border-gray-300">
            <th className="pb-1 font-bold">QTY</th>
            <th className="pb-1 font-bold pl-2">ITEM</th>
            <th className="pb-1 font-bold text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const name = item.productName || item.Product?.name || 'Unknown Item';
            const sku = item.productSku || item.Product?.sku;
            const price = parseFloat(item.unitPrice || item.price_at_sale || 0);

            return (
              <tr key={idx} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 align-top">x{item.quantity}</td>
                <td className="py-1.5 pl-2 align-top break-words">
                  <span className="font-bold">{name}</span>
                  {sku && <span className="block text-[8px] text-gray-500 font-mono">{sku}</span>}
                </td>
                <td className="py-1.5 align-top text-right">
                  ₱{(item.quantity * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Financial Summary */}
      <div className="space-y-1 text-right text-[10px]">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (12%):</span>
          <span>₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-[12px] border-t border-dashed border-gray-300 pt-1 mt-1">
          <span>TOTAL AMOUNT:</span>
          <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="uppercase">PAID VIA {receipt.paymentMethod || receipt.payment_method || "CASH"}:</span>
          <span>₱{parseFloat(receipt.amountPaid || receipt.amount_paid || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {(receipt.paymentMethod === "cash" || receipt.payment_method === "cash") && (
          <div className="flex justify-between font-bold">
            <span>CHANGE:</span>
            <span>₱{parseFloat(receipt.changeAmount || receipt.change_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-3"></div>

      {/* Footer */}
      <div className="text-center text-[9px] text-gray-600 space-y-1">
        <p className="font-bold">THANK YOU FOR YOUR PATRONAGE!</p>
        <p>Please keep this receipt for warranty claims.</p>
        <p className="text-[7px] text-gray-400 mt-2 font-mono">Powered by PC Alley POS</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// A4 Modern Invoice Template
// ─────────────────────────────────────────────────────────────────
function A4InvoiceTemplate({ receipt }) {
  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.12;
  const grandTotal = subtotal + tax;

  return (
    <div className="w-full max-w-[800px] mx-auto p-8 bg-white text-gray-800 font-sans text-xs leading-relaxed select-text border border-gray-200 rounded-md">
      {/* Top Banner Accent */}
      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-md -mx-8 -mt-8 mb-6"></div>

      {/* Header Grid */}
      <div className="flex justify-between items-start mb-8 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">PC ALLEY</h1>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mt-1">Computer Parts & Retail Shop</p>
          <div className="mt-4 text-[10px] text-gray-600 space-y-0.5">
            <p className="font-bold text-gray-800 text-xs">STORE LOCALE</p>
            <p>Branch: {receipt.Branch?.name || "PC Alley Main"}</p>
            {receipt.Branch?.location && <p>{receipt.Branch.location}</p>}
            {receipt.Branch?.phone && <p>Tel: {receipt.Branch.phone}</p>}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-indigo-800 font-bold text-[10px] uppercase tracking-wider mb-3">
            Sales Invoice
          </div>
          <p className="text-gray-500 font-medium text-[10px] uppercase tracking-wider">Invoice ID</p>
          <p className="font-bold text-gray-800 text-sm">{receipt.invoiceNumber || receipt.id}</p>
          <p className="text-gray-500 font-medium text-[10px] uppercase tracking-wider mt-2">Date / Time</p>
          <p className="font-bold text-gray-800">{new Date(receipt.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <hr className="border-gray-200 mb-6" />

      {/* Invoice Particulars */}
      <div className="grid grid-cols-2 gap-8 mb-8 text-left">
        <div>
          <h3 className="font-black text-indigo-900 uppercase tracking-widest text-[9px] mb-2">Billed To Customer</h3>
          <p className="text-sm font-bold text-gray-900">{receipt.customerName || receipt.customer_name || "Walk-in Customer"}</p>
          {receipt.Customer && (
            <div className="text-gray-600 mt-1 space-y-0.5 text-[10px]">
              {receipt.Customer.email && <p>Email: {receipt.Customer.email}</p>}
              {receipt.Customer.phone && <p>Phone: {receipt.Customer.phone}</p>}
              {receipt.Customer.address && <p>Address: {receipt.Customer.address}</p>}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-black text-indigo-900 uppercase tracking-widest text-[9px] mb-2">Sales Staff Ledger</h3>
          <p className="text-sm font-bold text-gray-900">{receipt.staffName || receipt.staff_name || (receipt.User ? receipt.User.full_name : "Cashier")}</p>
          <p className="text-[10px] text-gray-600 mt-1">Cashier Associate</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="bg-indigo-50 border-b border-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-wider">
            <th className="py-3 px-4">Product Name</th>
            <th className="py-3 px-4">SKU</th>
            <th className="py-3 px-4 text-center">Qty</th>
            <th className="py-3 px-4 text-right">Unit Price</th>
            <th className="py-3 px-4 text-right">Total Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const name = item.productName || item.Product?.name || 'Unknown Item';
            const sku = item.productSku || item.Product?.sku || '—';
            const price = parseFloat(item.unitPrice || item.price_at_sale || 0);

            return (
              <tr key={idx} className="border-b border-gray-100 text-gray-700">
                <td className="py-3 px-4 font-semibold text-gray-950">{name}</td>
                <td className="py-3 px-4 font-mono text-[10px] text-gray-500">{sku}</td>
                <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                <td className="py-3 px-4 text-right">₱{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">₱{(item.quantity * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Box */}
      <div className="flex justify-end">
        <div className="w-72 bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2 text-left">
          <div className="flex justify-between text-gray-500 font-bold text-[10px] uppercase">
            <span>Subtotal</span>
            <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-gray-500 font-bold text-[10px] uppercase">
            <span>VAT Input Tax (12%)</span>
            <span>₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between text-indigo-900 font-black text-sm uppercase">
            <span>Grand Total</span>
            <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px] uppercase pt-2">
            <span>Tender Type</span>
            <span className="font-bold">{receipt.paymentMethod || receipt.payment_method || "CASH"}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px] uppercase">
            <span>Amount Paid</span>
            <span>₱{parseFloat(receipt.amountPaid || receipt.amount_paid || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {(receipt.paymentMethod === "cash" || receipt.payment_method === "cash") && (
            <div className="flex justify-between text-green-700 font-bold text-[10px] uppercase bg-green-50 border border-green-100/30 p-1.5 rounded-lg">
              <span>Change Due</span>
              <span>₱{parseFloat(receipt.changeAmount || receipt.change_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 text-center text-[10px] text-gray-400">
        <p className="font-bold text-gray-500">TERMS & CONDITIONS</p>
        <p className="mt-1">All items carry standard manufacturer warranties. Proof of payment is required for all returns.</p>
        <p className="mt-3 font-semibold text-indigo-600/60">Thank you for your business with PC Alley!</p>
      </div>
    </div>
  );
}

const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  const [printFormat, setPrintFormat] = useState("thermal"); // "thermal" or "invoice"

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNum = order.invoiceNumber || `INV-${order.id.toString().padStart(6, '0')}`;
  const customerName = order.customerName || order.customer_name || 'Walk-in Customer';
  const paymentMethod = order.paymentMethod || order.payment_method || 'CASH';
  
  const items = order.SaleItems || order.OrderItems || [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.12;
  const grandTotal = subtotal + tax;

  const amountPaid = parseFloat(order.amountPaid || order.amount_paid || grandTotal);
  const changeAmount = parseFloat(order.changeAmount || order.change_amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar no-print">
      {/* Embedded print style block */}
      <style jsx="true" global="true">{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide normal components */
          body > div:first-child,
          main,
          aside,
          nav,
          button,
          header,
          footer,
          .no-print,
          .fixed {
            display: none !important;
            height: 0 !important;
            opacity: 0 !important;
            overflow: hidden !important;
          }
          /* Show print elements */
          #print-ledger-receipt-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Hidden printable area */}
      <div className="hidden print:block" id="print-ledger-receipt-area">
        {printFormat === "thermal" ? (
          <ThermalReceiptTemplate receipt={order} />
        ) : (
          <A4InvoiceTemplate receipt={order} />
        )}
      </div>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brand-surface border border-brand-neonblue/20 rounded-2xl max-w-4xl w-full shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh] no-print">
        
        {/* Left Side: Order Ledger / Information View */}
        <div className="flex-1 p-6 md:p-8 bg-brand-surface border-r border-border/50 overflow-y-auto custom-scrollbar">
          <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-main text-xs uppercase font-black tracking-widest mb-6 transition-colors">
            <ChevronLeft size={16} /> Back to Ledger
          </button>
          
          <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-6 text-left">
            <div>
              <h2 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">{invoiceNum}</h2>
              <p className="text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                <Calendar size={12} /> {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-black tracking-widest text-muted">Customer</span>
              <span className="font-bold text-main">{customerName}</span>
            </div>
          </div>

          <div className="mb-6 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-3">Itemized Receipt</h3>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const name = item.productName || item.Product?.name || 'Unknown Item';
                const sku = item.productSku || item.Product?.sku;
                const price = parseFloat(item.unitPrice || item.price_at_sale || 0);

                return (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-brand-bgbase/50 border border-border/20">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-brand-surface flex items-center justify-center text-muted border border-border/50">
                        <Tag size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-main text-sm">{name}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Qty: {item.quantity} × ₱{price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="font-black text-main">
                      ₱{(item.quantity * price).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-brand-bgbase/30 rounded-xl p-4 border border-border/10 flex flex-col items-end text-right">
            <p className="flex justify-between w-48 text-muted text-xs font-bold mb-1 uppercase tracking-widest"><span>Subtotal</span><span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            <p className="flex justify-between w-48 text-muted text-xs font-bold mb-1 uppercase tracking-widest"><span>VAT (12%)</span><span>₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            <p className="flex justify-between w-48 text-main font-black text-xl border-t border-border/50 pt-2 uppercase"><span>Total</span><span className="text-brand-neonblue">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>

        {/* Right Side: Receipt Preview & Controls */}
        <div className="w-full md:w-96 bg-[#f9fafb] text-black p-6 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <span className="text-[10px] uppercase font-black tracking-[2px] text-gray-500">Receipt Preview</span>
              <button onClick={handlePrint} className="px-3 py-1.5 rounded bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition">
                <Printer size={12} /> Print
              </button>
            </div>

            {/* Print Preferences Toggle in Ledger Details */}
            <div className="mb-4 shrink-0">
              <div className="grid grid-cols-2 gap-2 bg-gray-200 border border-gray-300 p-1 rounded-xl">
                <button
                  onClick={() => setPrintFormat("thermal")}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    printFormat === "thermal"
                      ? "bg-white border border-gray-300 text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  📄 Thermal
                </button>
                <button
                  onClick={() => setPrintFormat("invoice")}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    printFormat === "invoice"
                      ? "bg-white border border-gray-300 text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  📑 A4 Invoice
                </button>
              </div>
            </div>
            
            {/* The actual preview viewport */}
            <div className="flex-1 overflow-y-auto bg-white p-4 shadow-sm border border-gray-200 rounded-xl custom-scrollbar">
               {printFormat === "thermal" ? (
                 <div className="flex justify-center scale-90 origin-top">
                   <ThermalReceiptTemplate receipt={order} />
                 </div>
               ) : (
                 <div className="scale-95 origin-top">
                   <A4InvoiceTemplate receipt={order} />
                 </div>
               )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


export default function SalesLedgerPage() {
  const { theme } = useTheme();
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch(apiUrl("/api/sales/history"), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const raw = await res.json();
        setSales(raw.data || raw);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredSales = sales.filter(s => {
    const invoiceNum = s.invoiceNumber || '';
    const customer = s.customerName || s.customer_name || '';
    return s.id.toString().includes(search) || 
      invoiceNum.toLowerCase().includes(search.toLowerCase()) ||
      customer.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const exportData = filteredSales.map(s => {
      const invoiceNum = s.invoiceNumber || `INV-${s.id.toString().padStart(6, '0')}`;
      const customerName = s.customerName || s.customer_name || 'Walk-in';
      const paymentMethod = s.paymentMethod || s.payment_method || 'CASH';
      const totalAmount = parseFloat(s.totalAmount || s.total_amount || 0);
      const items = s.SaleItems || s.OrderItems || [];

      return {
        'Order ID': invoiceNum,
        'Date': new Date(s.createdAt).toLocaleDateString(),
        'Time': new Date(s.createdAt).toLocaleTimeString(),
        'Customer': customerName,
        'Items': items.length,
        'Payment Method': paymentMethod.toUpperCase(),
        'Total Amount': totalAmount,
        'Branch': s.Branch?.name || 'Unknown'
      };
    });

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || curr.total_amount || 0), 0);
    const exportOptions = {
      title: 'PC ALLEY - SALES AUDIT LEDGER',
      subtitle: `Protocol: Full Transaction History | Filter: ${search || 'All Records'}`,
      summary: {
        'Total Transactions': filteredSales.length,
        'Gross Revenue': `₱${totalRevenue.toLocaleString()}`,
        'Average Order Value': `₱${(totalRevenue / (filteredSales.length || 1)).toLocaleString()}`,
        'System Integrity': 'Verified'
      }
    };

    try {
      exportToExcel(exportData, 'PCA_Sales_Ledger', 'Transactions', exportOptions);
      showSuccess("Excel Sales Matrix Generated");
    } catch (e) {
      showError("Export Error");
    }
  };

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES LEDGER" />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 w-full max-w-[1400px] mx-auto">
          
          <div className="mb-8">
             <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2">Sales History</motion.h2>
             <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
               All <span className="text-brand-neonblue">Sales</span>
             </motion.h1>
          </div>

          {/* Filter Bar */}
          <div className="bg-brand-surface border border-border/50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
               <input 
                 type="text" 
                 placeholder="Search by Order ID or Customer..." 
                 value={search} 
                 onChange={e => setSearch(e.target.value)} 
                 className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-9 pr-4 py-3 outline-none focus:border-brand-neonblue transition-colors flex-1" 
               />
             </div>
             <button className="bg-brand-bgbase border border-border/50 px-4 py-2.5 rounded-lg flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/50 transition-colors w-full sm:w-auto text-[11px] uppercase tracking-widest font-black gap-2">
               <Filter size={14} /> Filter Date
             </button>
             <button 
               onClick={handleExport}
               className="bg-brand-bgbase border border-border/50 px-5 py-2.5 rounded-lg flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/50 transition-colors w-full sm:w-auto text-[11px] uppercase tracking-widest font-black gap-2"
             >
               <FileDown size={14} className="text-brand-neonblue" /> Export Excel
             </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-brand-surface border border-border/50 rounded-xl shadow-sm overflow-hidden flex flex-col">
             <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[60vh]">
               <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                  <thead>
                    <tr className="bg-brand-bgbase/50 text-[10px] uppercase font-black tracking-widest text-muted border-b border-border/50">
                      <th className="py-4 px-6">Order ID</th>
                      <th className="py-4 px-6">Date & Time</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Total Items</th>
                      <th className="py-4 px-6">Payment</th>
                      <th className="py-4 px-6 text-right">Revenue</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((order, idx) => {
                      const invoiceNum = order.invoiceNumber || `INV-${order.id.toString().padStart(6, '0')}`;
                      const customerName = order.customerName || order.customer_name || 'Walk-in';
                      const paymentMethod = order.paymentMethod || order.payment_method || 'CASH';
                      const totalAmount = parseFloat(order.totalAmount || order.total_amount || 0);
                      const items = order.SaleItems || order.OrderItems || [];

                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: idx * 0.03 }} 
                          key={idx} 
                          className="border-b border-border/20 text-sm hover:bg-brand-bgbase/30 transition-colors group"
                        >
                          <td className="py-4 px-6 font-black text-brand-neonblue">
                            {invoiceNum}
                          </td>
                          <td className="py-4 px-6 font-bold text-muted/80 text-xs">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 font-bold text-main">
                            {customerName}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-brand-bgbase border border-border/50 rounded text-[9px] font-black text-muted">
                              {items.length} Products
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {paymentMethod.toLowerCase() === 'cash' ? <Banknote size={14} className="text-green-500"/> : <CreditCard size={14} className="text-brand-neonblue"/>}
                              <span className="text-[10px] uppercase font-black tracking-wider text-main/80">{paymentMethod}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-black text-main text-lg tracking-tight">
                            ₱{totalAmount.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-center">
                             <button onClick={() => setActiveOrder(order)} className="px-4 py-1.5 rounded-lg bg-brand-bgbase border border-border/50 text-muted hover:text-main hover:bg-border/20 transition-colors inline-flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-50 group-hover:opacity-100">
                               <Eye size={12} /> View Details
                             </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {filteredSales.length === 0 && (
                      <tr><td colSpan="7" className="py-20 text-center text-muted font-bold tracking-widest uppercase text-xs">No sales found.</td></tr>
                    )}
                  </tbody>
               </table>
             </div>

             {/* Pagination Controls */}
             {totalPages > 0 && (
               <div className="border-t border-border/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-bgbase/30">
                 <span className="text-xs font-bold text-muted uppercase tracking-widest">
                   Showing {filteredSales.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} Entries
                 </span>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="px-4 py-2 rounded-lg bg-brand-surface border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Prev
                   </button>
                   <div className="flex gap-1 items-center px-2">
                     <span className="text-[11px] font-black text-main">{currentPage} / {totalPages || 1}</span>
                   </div>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="px-4 py-2 rounded-lg bg-brand-surface border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Next
                   </button>
                 </div>
               </div>
             )}
          </div>

        </div>
      </main>

      <AnimatePresence>
        {activeOrder && <OrderDetailsModal isOpen={true} onClose={() => setActiveOrder(null)} order={activeOrder} />}
      </AnimatePresence>
    </div>
  );
}
