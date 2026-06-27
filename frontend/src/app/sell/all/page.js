"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ThermalReceiptModal } from "@/components/ThermalReceipt";
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
import { showSuccess, showError } from "@/context/ModalContext";
import { exportToExcel } from "@/lib/excelExport";
import { useTheme } from "@/context/ThemeContext";
import { apiUrl } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────
// Order Details Modal – uses shared ThermalReceiptModal for printing
// ─────────────────────────────────────────────────────────────────
const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  const [showThermalPreview, setShowThermalPreview] = useState(false);

  if (!isOpen || !order) return null;

  const invoiceNum   = order.invoiceNumber || `INV-${order.id.toString().padStart(6, "0")}`;
  const customerName = order.customerName || order.customer_name || "Walk-in Customer";
  const paymentMethod = (order.paymentMethod || order.payment_method || "CASH").toUpperCase();

  const items    = order.SaleItems || order.OrderItems || [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
    return sum + price * item.quantity;
  }, 0);
  const tax         = subtotal * 0.12;
  const grandTotal  = subtotal + tax;
  const amountPaid  = parseFloat(order.amountPaid  || order.amount_paid  || grandTotal);
  const changeAmount = parseFloat(order.changeAmount || order.change_amount || 0);

  return (
    <>
      {/* ── Thermal Receipt Preview Modal ── */}
      <ThermalReceiptModal
        receipt={order}
        isOpen={showThermalPreview}
        onClose={() => setShowThermalPreview(false)}
      />

      {/* ── Order Details Modal ── */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-brand-surface border border-brand-neonblue/20 rounded-2xl max-w-4xl w-full shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
        >
          {/* Left Side – Order Information */}
          <div className="flex-1 p-6 md:p-8 bg-brand-surface border-r border-border/50 overflow-y-auto custom-scrollbar">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-muted hover:text-main text-xs uppercase font-black tracking-widest mb-6 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Ledger
            </button>

            <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-6 text-left">
              <div>
                <h2 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">
                  {invoiceNum}
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                  <Calendar size={12} /> {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase font-black tracking-widest text-muted">Customer</span>
                <span className="font-bold text-main">{customerName}</span>
              </div>
            </div>

            {/* Itemized list */}
            <div className="mb-6 text-left">
              <h3 className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-3">
                Itemized Receipt
              </h3>
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const name  = item.productName || item.Product?.name || "Unknown Item";
                  const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-brand-bgbase/50 border border-border/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-brand-surface flex items-center justify-center text-muted border border-border/50">
                          <Tag size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-main text-sm">{name}</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">
                            Qty: {item.quantity} × ₱{price.toLocaleString()}
                          </p>
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

            {/* Totals */}
            <div className="bg-brand-bgbase/30 rounded-xl p-4 border border-border/10 flex flex-col items-end text-right">
              <p className="flex justify-between w-48 text-muted text-xs font-bold mb-1 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="flex justify-between w-48 text-muted text-xs font-bold mb-1 uppercase tracking-widest">
                <span>VAT (12%)</span>
                <span>₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="flex justify-between w-48 text-main font-black text-xl border-t border-border/50 pt-2 uppercase">
                <span>Total</span>
                <span className="text-brand-neonblue">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          {/* Right Side – Receipt Controls */}
          <div className="w-full md:w-80 bg-[#f9fafb] text-black p-6 flex flex-col gap-4 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-black tracking-[2px] text-gray-500">
                Receipt Options
              </span>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-[10px] space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold uppercase tracking-widest">Invoice</span>
                <span className="font-mono font-bold text-gray-800">{invoiceNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold uppercase tracking-widest">Payment</span>
                <span className="font-bold text-gray-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold uppercase tracking-widest">Amount Paid</span>
                <span className="font-bold text-gray-800">
                  ₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {paymentMethod === "CASH" && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">Change</span>
                  <span className="font-bold text-green-600">
                    ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
                <span className="font-black text-gray-700 uppercase tracking-widest">Grand Total</span>
                <span className="font-black text-indigo-700 text-sm">
                  ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Print CTA */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center flex flex-col gap-3">
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                🧾 80mm Thermal Receipt
              </p>
              <button
                onClick={() => setShowThermalPreview(true)}
                className="w-full py-3 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow"
              >
                <Printer size={13} /> Preview &amp; Print
              </button>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3 border border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-gray-100 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};


export default function SalesLedgerPage() {
  const { theme } = useTheme();
  const [sales, setSales]             = useState([]);
  const [search, setSearch]           = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch(apiUrl("/api/sales/history"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
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
    const invoiceNum   = s.invoiceNumber || "";
    const customer     = s.customerName  || s.customer_name || "";
    return (
      s.id.toString().includes(search) ||
      invoiceNum.toLowerCase().includes(search.toLowerCase()) ||
      customer.toLowerCase().includes(search.toLowerCase())
    );
  });

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages    = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const exportData = filteredSales.map(s => {
      const invoiceNum    = s.invoiceNumber || `INV-${s.id.toString().padStart(6, "0")}`;
      const customerName  = s.customerName  || s.customer_name || "Walk-in";
      const paymentMethod = s.paymentMethod || s.payment_method || "CASH";
      const totalAmount   = parseFloat(s.totalAmount || s.total_amount || 0);
      const items         = s.SaleItems || s.OrderItems || [];
      return {
        "Order ID":       invoiceNum,
        "Date":           new Date(s.createdAt).toLocaleDateString(),
        "Time":           new Date(s.createdAt).toLocaleTimeString(),
        "Customer":       customerName,
        "Items":          items.length,
        "Payment Method": paymentMethod.toUpperCase(),
        "Total Amount":   totalAmount,
        "Branch":         s.Branch?.name || "Unknown"
      };
    });

    const totalRevenue = filteredSales.reduce(
      (acc, curr) => acc + parseFloat(curr.totalAmount || curr.total_amount || 0), 0
    );
    const exportOptions = {
      title: "PC ALLEY - SALES AUDIT LEDGER",
      subtitle: `Protocol: Full Transaction History | Filter: ${search || "All Records"}`,
      summary: {
        "Total Transactions": filteredSales.length,
        "Gross Revenue":      `₱${totalRevenue.toLocaleString()}`,
        "Average Order Value": `₱${(totalRevenue / (filteredSales.length || 1)).toLocaleString()}`,
        "System Integrity":   "Verified"
      }
    };

    try {
      exportToExcel(exportData, "PCA_Sales_Ledger", "Transactions", exportOptions);
      showSuccess("Excel Sales Matrix Generated");
    } catch (e) {
      showError("Export Error");
    }
  };

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === "dark" ? "bg-[#0a0a0a]" : "bg-[#f0f0eb]"}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES LEDGER" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 w-full max-w-[1400px] mx-auto">

          <div className="mb-8">
            <motion.h2
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2"
            >
              Sales History
            </motion.h2>
            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-rajdhani font-black tracking-tight text-main uppercase"
            >
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
                className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-9 pr-4 py-3 outline-none focus:border-brand-neonblue transition-colors"
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
                    <th className="py-4 px-6">Date &amp; Time</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Total Items</th>
                    <th className="py-4 px-6">Payment</th>
                    <th className="py-4 px-6 text-right">Revenue</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((order, idx) => {
                    const invoiceNum    = order.invoiceNumber || `INV-${order.id.toString().padStart(6, "0")}`;
                    const customerName  = order.customerName  || order.customer_name || "Walk-in";
                    const paymentMethod = order.paymentMethod || order.payment_method || "CASH";
                    const totalAmount   = parseFloat(order.totalAmount || order.total_amount || 0);
                    const items         = order.SaleItems || order.OrderItems || [];

                    return (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/20 text-sm hover:bg-brand-bgbase/30 transition-colors group"
                      >
                        <td className="py-4 px-6 font-black text-brand-neonblue">{invoiceNum}</td>
                        <td className="py-4 px-6 font-bold text-muted/80 text-xs">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-bold text-main">{customerName}</td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-brand-bgbase border border-border/50 rounded text-[9px] font-black text-muted">
                            {items.length} Products
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {paymentMethod.toLowerCase() === "cash"
                              ? <Banknote size={14} className="text-green-500" />
                              : <CreditCard size={14} className="text-brand-neonblue" />
                            }
                            <span className="text-[10px] uppercase font-black tracking-wider text-main/80">
                              {paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-main text-lg tracking-tight">
                          ₱{totalAmount.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setActiveOrder(order)}
                            className="px-4 py-1.5 rounded-lg bg-brand-bgbase border border-border/50 text-muted hover:text-main hover:bg-border/20 transition-colors inline-flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-50 group-hover:opacity-100"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-20 text-center text-muted font-bold tracking-widest uppercase text-xs">
                        No sales found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
        {activeOrder && (
          <OrderDetailsModal
            isOpen={true}
            onClose={() => setActiveOrder(null)}
            order={activeOrder}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
