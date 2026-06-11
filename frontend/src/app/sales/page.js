"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useLayout } from "@/context/LayoutContext";
import { useAuthGuard } from "@/lib/useAuthGuard";
import {
  ShoppingCart,
  Search,
  Trash2,
  CreditCard,
  Banknote,
  User,
  CheckCircle2,
  Package,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  X,
  UserCheck,
  Printer,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

// ─────────────────────────────────────────────────────────────────
// Thermal Receipt Template (80mm width)
// ─────────────────────────────────────────────────────────────────
function ThermalReceiptTemplate({ receipt }) {
  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.unitPrice || item.price_at_sale) * item.quantity, 0);
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
        <p><span className="font-bold">Customer:</span> {receipt.customerName || "Walk-in Customer"}</p>
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
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 align-top">x{item.quantity}</td>
              <td className="py-1.5 pl-2 align-top break-words">
                <span className="font-bold">{item.productName}</span>
                {item.productSku && <span className="block text-[8px] text-gray-500 font-mono">{item.productSku}</span>}
              </td>
              <td className="py-1.5 align-top text-right">
                ₱{(item.quantity * parseFloat(item.unitPrice || item.price_at_sale)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
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
          <span className="uppercase">PAID VIA {receipt.paymentMethod || "CASH"}:</span>
          <span>₱{parseFloat(receipt.amountPaid || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {receipt.paymentMethod === "cash" && (
          <div className="flex justify-between font-bold">
            <span>CHANGE:</span>
            <span>₱{parseFloat(receipt.changeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.unitPrice || item.price_at_sale) * item.quantity, 0);
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
          <p className="text-sm font-bold text-gray-900">{receipt.customerName || "Walk-in Customer"}</p>
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
          <p className="text-sm font-bold text-gray-900">{receipt.staffName || (receipt.User ? receipt.User.full_name : "Cashier")}</p>
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
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100 text-gray-700">
              <td className="py-3 px-4 font-semibold text-gray-950">{item.productName}</td>
              <td className="py-3 px-4 font-mono text-[10px] text-gray-500">{item.productSku || "—"}</td>
              <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
              <td className="py-3 px-4 text-right">₱{parseFloat(item.unitPrice || item.price_at_sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="py-3 px-4 text-right font-bold text-gray-900">₱{(item.quantity * parseFloat(item.unitPrice || item.price_at_sale)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
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
            <span className="font-bold">{receipt.paymentMethod || "CASH"}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px] uppercase">
            <span>Amount Paid</span>
            <span>₱{parseFloat(receipt.amountPaid || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {receipt.paymentMethod === "cash" && (
            <div className="flex justify-between text-green-700 font-bold text-[10px] uppercase bg-green-50 border border-green-100/30 p-1.5 rounded-lg">
              <span>Change Due</span>
              <span>₱{parseFloat(receipt.changeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

// ─────────────────────────────────────────────────────────────────
// Success / Receipt Modal
// ─────────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, onClose, receipt }) {
  const [printFormat, setPrintFormat] = useState("thermal"); // "thermal" or "invoice"
  const [viewingReceipt, setViewingReceipt] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.unitPrice || item.price_at_sale) * item.quantity, 0);
  const grandTotal = subtotal * 1.12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar no-print">
      {/* Embedded print style block */}
      <style jsx="true" global="true">{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide standard document nodes */
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
          /* Make sure the printed area is the only visible thing */
          #print-receipt-area {
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

      {/* Hidden print element */}
      <div className="hidden print:block" id="print-receipt-area">
        {printFormat === "thermal" ? (
          <ThermalReceiptTemplate receipt={receipt} />
        ) : (
          <A4InvoiceTemplate receipt={receipt} />
        )}
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-brand-surface border border-border rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative z-55 max-h-[90vh] flex flex-col no-print"
      >
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {!viewingReceipt ? (
            /* SUCCESS VIEW */
            <div className="text-center py-6 flex flex-col items-center">
              {/* Checkmark icon with scale-in animation */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-[28px] bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-6 text-green-500 shadow-[0_0_40px_rgba(34,197,94,0.15)] animate-[pulse_2s_infinite]"
              >
                <CheckCircle2 size={44} className="stroke-[2px]" />
              </motion.div>

              <h2 className="text-2xl font-rajdhani font-black text-main uppercase tracking-wider mb-1">
                Payment Successful
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-muted mb-8">
                Transaction Completed
              </p>

              {/* Transaction Summary Grid */}
              <div className="w-full max-w-sm bg-brand-bgbase/40 border border-border rounded-2xl p-5 mb-8 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold uppercase tracking-widest text-[9px]">Transaction ID</span>
                  <span className="font-mono font-bold text-main">{receipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold uppercase tracking-widest text-[9px]">Total Amount</span>
                  <span className="font-black text-brand-neonblue text-sm">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold uppercase tracking-widest text-[9px]">Branch</span>
                  <span className="font-bold text-main">{receipt.Branch?.name || "PC Alley Main"}</span>
                </div>
                {receipt.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted font-bold uppercase tracking-widest text-[9px]">Amount Paid</span>
                      <span className="font-bold text-main">₱{parseFloat(receipt.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted font-bold uppercase tracking-widest text-[9px]">Change</span>
                      <span className="font-bold text-green-500">₱{parseFloat(receipt.changeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Print Preferences Toggle */}
              <div className="mb-6 w-full max-w-sm">
                <p className="text-[9px] font-black text-muted uppercase tracking-[3px] mb-2.5 block text-center">Receipt Printing Format</p>
                <div className="grid grid-cols-2 gap-2 bg-brand-bgbase border border-border p-1 rounded-xl">
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      printFormat === "thermal"
                        ? "bg-brand-surface border border-border text-brand-neonblue shadow-sm"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    📄 80mm Thermal
                  </button>
                  <button
                    onClick={() => setPrintFormat("invoice")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      printFormat === "invoice"
                        ? "bg-brand-surface border border-border text-brand-neonblue shadow-sm"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    📑 A4 Invoice
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* RECEIPT VIEW */
            <div>
              <button
                onClick={() => setViewingReceipt(false)}
                className="flex items-center gap-2 text-muted hover:text-main text-xs uppercase font-black tracking-widest mb-6 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Summary
              </button>

              {/* Print Preferences Toggle in Receipt View */}
              <div className="flex justify-center mb-6">
                <div className="grid grid-cols-2 gap-2 w-72 bg-brand-bgbase border border-border p-1 rounded-xl">
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      printFormat === "thermal"
                        ? "bg-brand-surface border border-border text-brand-neonblue shadow-sm"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    📄 Thermal
                  </button>
                  <button
                    onClick={() => setPrintFormat("invoice")}
                    className={`py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      printFormat === "invoice"
                        ? "bg-brand-surface border border-border text-brand-neonblue shadow-sm"
                        : "text-muted hover:text-main"
                    }`}
                  >
                    📑 A4 Invoice
                  </button>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 overflow-x-auto shadow-inner min-h-[400px]">
                {printFormat === "thermal" ? (
                  <div className="flex justify-center">
                    <ThermalReceiptTemplate receipt={receipt} />
                  </div>
                ) : (
                  <A4InvoiceTemplate receipt={receipt} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-6 bg-brand-muted/5 border-t border-border flex flex-col sm:flex-row gap-3">
          {!viewingReceipt ? (
            <>
              <button
                onClick={() => setViewingReceipt(true)}
                className="flex-1 py-3 px-5 border border-border rounded-xl font-black uppercase tracking-wider text-[10px] text-muted hover:text-main hover:bg-brand-bgbase/40 transition-all"
              >
                View Receipt
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Printer size={14} /> Print Receipt
              </button>
            </>
          ) : (
            <button
              onClick={handlePrint}
              className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Printer size={14} /> Print This Receipt ({printFormat === "thermal" ? "80mm" : "A4"})
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 px-5 bg-brand-crimson hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all"
          >
            New Transaction
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SalesPage() {
  const { isMobile } = useLayout();
  const { user, isChecking } = useAuthGuard();
  const [cart, setCart]               = useState([]);
  const [inventory, setInventory]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [productSearch, setProductSearch]   = useState("");
  const [paymentMethod, setPaymentMethod]   = useState("Cash");
  const [cashPaid, setCashPaid]       = useState("");
  const [proofFile, setProofFile]     = useState(null);
  const [success, setSuccess]         = useState(false);
  const [processing, setProcessing]   = useState(false);

  // Branch Selector states
  const [branches, setBranches]       = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Receipt modal states
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Customer lookup state
  const [customerQuery, setCustomerQuery]     = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerDebounce = useRef(null);

  useEffect(() => {
    if (user) {
      if (user.role === "super_admin") {
        fetchBranches();
      } else if (user.branch_id) {
        setSelectedBranchId(user.branch_id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchInventory(selectedBranchId);
    } else if (user && user.role !== "super_admin") {
      fetchInventory();
    }
  }, [selectedBranchId, user]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        if (data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleBranchChange = (e) => {
    const newBranchId = e.target.value;
    if (cart.length > 0) {
      if (window.confirm("Changing branches will clear your current cart. Proceed?")) {
        setCart([]);
        setSelectedBranchId(newBranchId);
      }
    } else {
      setSelectedBranchId(newBranchId);
    }
  };

  const fetchInventory = async (branchId) => {
    const token = localStorage.getItem("token");
    const targetBranch = branchId || selectedBranchId;
    let url = "/api/inventory";
    if (targetBranch) {
      url += `?branch_id=${targetBranch}`;
    }
    try {
      const res = await fetch(apiUrl(url), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const raw = await res.json();
        // API may return envelope with data array
        const items = raw.data ?? raw;
        if (res.ok) setInventory(items);
    } catch {
      showError("Network link interrupted");
    } finally {
      setLoading(false);
    }
  };

  // Customer search with debounce
  const handleCustomerSearch = (val) => {
    setCustomerQuery(val);
    if (!val || val.length < 2) {
      setCustomerResults([]);
      return;
    }
    clearTimeout(customerDebounce.current);
    setCustomerSearching(true);
    customerDebounce.current = setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl(`/api/customers/search?q=${encodeURIComponent(val)}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setCustomerResults(await res.json());
      } catch { /* silent */ }
      finally { setCustomerSearching(false); }
    }, 350);
  };

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setCustomerResults([]);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
  };

  // Derived product list
  const categories = ["All", ...new Set(inventory.map(i => i.Product?.Category?.name).filter(Boolean))];
  const filteredInventory = inventory.filter(item => {
    const matchCat = activeCategory === "All" || item.Product?.Category?.name === activeCategory;
    const matchSearch = !productSearch ||
      item.Product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.Product?.sku?.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.product_id);
    if (existing) {
      if (existing.quantity >= item.quantity) { showError("Stock threshold reached"); return; }
      setCart(cart.map(c => c.id === item.product_id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (item.quantity <= 0) { showError("Out of stock"); return; }
      setCart([...cart, {
        id: item.product_id,
        name: item.Product.name,
        price: item.Product.price,
        sku: item.Product.sku,
        quantity: 1,
        maxStock: item.quantity
      }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.quantity + delta);
      if (newQty > item.maxStock) { showError("Insufficient stock"); return item; }
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const subtotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax        = subtotal * 0.12;
  const grandTotal = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || processing) return;
    if (paymentMethod === "Cash" && (!cashPaid || parseFloat(cashPaid) < grandTotal)) {
      showError("Insufficient Cash Received");
      return;
    }
    setProcessing(true);
    const token = localStorage.getItem("token");

    try {
      let backendPaymentMethod = paymentMethod.toLowerCase();
      if (backendPaymentMethod === "bank") backendPaymentMethod = "bank_transfer";

      const payload = {
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        customer_id:   selectedCustomer?.id   || undefined,
        payment_method: backendPaymentMethod,
        branch_id:     selectedBranchId || undefined,
        amount_paid:   paymentMethod === "Cash" ? parseFloat(cashPaid) : grandTotal,
        change_amount: paymentMethod === "Cash" ? Math.max(0, parseFloat(cashPaid) - grandTotal) : 0,
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity }))
      };

      let res;
      if (proofFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          fd.append(k, typeof v === "object" && k === "items" ? JSON.stringify(v) : v ?? "");
        });
        fd.append("proof_of_payment", proofFile);
        res = await fetch(apiUrl("/api/sales"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
      } else {
        res = await fetch(apiUrl("/api/sales"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setReceiptData(data);
        setShowReceiptModal(true);
        showSuccess(`Sale recorded — ${data.invoiceNumber || "Invoice generated"}`);
        setProofFile(null);
        setCashPaid("");
        fetchInventory(selectedBranchId);
      } else {
        const err = await res.json();
        showError(err.error || err.message || "Transaction Failed");
      }
    } catch {
      showError("Network connection error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES TERMINAL" />

        <div className="flex-1 overflow-y-auto md:overflow-hidden p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 bg-brand-bgbase text-main custom-scrollbar">

          {/* ── Left: Product Grid ── */}
          <div className="flex-[2] flex flex-col space-y-4 md:overflow-hidden">

            {/* Search + Branch Selector */}
            <div className="flex gap-4">
              <div className="relative flex-1 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-neonblue transition-colors" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU…"
                  className="w-full bg-brand-surface border border-border rounded-2xl py-4 pl-11 pr-4 text-sm text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold tracking-tight shadow-sm"
                />
              </div>
              {user?.role === "super_admin" && branches.length > 0 && (
                <div className="w-56">
                  <select
                    value={selectedBranchId}
                    onChange={handleBranchChange}
                    className="w-full h-full bg-brand-surface border border-border rounded-2xl px-4 py-4 text-sm text-main font-bold focus:outline-none focus:border-brand-neonblue/30 shadow-sm"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        🏪 {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
              {categories.map(cat => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-[2px] transition-all shrink-0 ${
                    activeCategory === cat
                      ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue shadow-sm"
                      : "bg-brand-surface border-border text-muted hover:text-main"
                  }`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                {loading ? (
                  <div className="col-span-full py-20 flex flex-col items-center opacity-40">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-[4px]">Loading Products…</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredInventory.map((item, i) => (
                      <motion.div
                        key={item.product_id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addToCart(item)}
                        className={`group bg-brand-surface border rounded-[24px] p-4 cursor-pointer hover:bg-brand-muted/5 transition-all relative overflow-hidden shadow-sm hover:shadow-md ${
                          item.quantity <= 5 
                            ? 'border-red-500/30 hover:border-red-500/50' 
                            : 'border-border hover:border-brand-neonblue/30'
                        }`}
                      >
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-surface/80 backdrop-blur-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-all z-10">
                          <Plus size={14} className="text-brand-neonblue" />
                        </div>
                        
                        {/* Product Image Header */}
                        <div className="w-full h-32 rounded-xl overflow-hidden mb-3.5 bg-brand-bgbase relative flex items-center justify-center border border-border/50">
                          {/* Fallback layout in background */}
                          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center opacity-30 text-muted">
                            <Package size={28} className="stroke-[1px]" />
                            <span className="text-[7px] uppercase tracking-widest font-black mt-1">NO IMAGE</span>
                          </div>

                          {(item.Product.product_image || item.Product.image_url) && (
                            <img 
                              src={apiUrl(item.Product.product_image || item.Product.image_url).replace('.webp', '_thumbnail.webp')} 
                              alt={item.Product.name} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-300 z-10"
                              loading="lazy"
                              onError={(e) => {
                                if (e.target.src.includes('_thumbnail.webp')) {
                                  e.target.src = e.target.src.replace('_thumbnail.webp', '_medium.webp');
                                } else {
                                  e.target.style.display = 'none';
                                }
                              }}
                            />
                          )}
                          
                          {/* Floating Category Tag */}
                          {item.Product.Category?.name && (
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white z-20">
                              {item.Product.Category.name}
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <h4 className="text-sm font-rajdhani font-black text-main mb-0.5 group-hover:text-brand-neonblue transition-colors truncate capitalize" title={item.Product.name}>
                          {item.Product.name}
                        </h4>
                        <p className="text-[9px] font-mono tracking-wider text-muted/40 mb-3 truncate">
                          {item.Product.sku}
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-base font-rajdhani font-black text-main">₱{parseFloat(item.Product.price).toLocaleString()}</span>
                          <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                            item.quantity <= 5 
                              ? "bg-red-500/10 border-red-500/20 text-red-500" 
                              : "bg-green-500/10 border-green-500/20 text-green-500"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.quantity <= 5 ? "bg-red-500" : "bg-green-500"}`}></span>
                            {item.quantity} left
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Checkout Panel ── */}
          <div className="lg:w-[380px] bg-brand-surface border border-border rounded-[32px] md:rounded-[40px] flex flex-col relative overflow-hidden shadow-sm min-h-[500px] mb-8 lg:mb-0 shrink-0">

            {/* Header */}
            <div className="p-5 md:p-7 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-rajdhani font-black tracking-[1.5px] uppercase flex items-center gap-2 text-main">
                  <ShoppingCart size={16} className="text-brand-neonpurple" /> Order Summary
                </h3>
                <span className="px-2.5 py-1 bg-brand-bgbase border border-border rounded-full text-[9px] font-black text-muted uppercase tracking-widest">
                  {cart.length} ITEMS
                </span>
              </div>

              {/* Customer Lookup */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-brand-bgbase border border-border rounded-xl px-3 py-2.5">
                  {selectedCustomer ? (
                    <UserCheck size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <User size={14} className="text-muted/40 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    placeholder="Search customer (optional)…"
                    className="flex-1 bg-transparent text-xs font-bold text-main placeholder:text-muted/30 outline-none"
                  />
                  {customerSearching && <Loader2 size={12} className="animate-spin text-muted/40 shrink-0" />}
                  {selectedCustomer && (
                    <button onClick={clearCustomer} className="text-muted/40 hover:text-brand-crimson transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Dropdown results */}
                <AnimatePresence>
                  {customerResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-border rounded-xl overflow-hidden z-20 shadow-xl"
                    >
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-bgbase/60 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border flex items-center justify-center font-black text-[10px] text-muted shrink-0">
                            {c.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-main">{c.name}</p>
                            <p className="text-[9px] text-muted font-bold">{c.phone || c.email || "—"}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-[9px] text-green-500 font-black">₱{parseFloat(c.totalSpent || 0).toLocaleString()}</p>
                            <p className="text-[8px] text-muted font-bold">{c.totalOrders} orders</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedCustomer && (
                  <div className="mt-2 px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl flex items-center gap-2">
                    <UserCheck size={12} className="text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-green-500 truncate">{selectedCustomer.name}</p>
                      <p className="text-[9px] text-muted font-bold">{selectedCustomer.totalOrders} orders • ₱{parseFloat(selectedCustomer.totalSpent || 0).toLocaleString()} spent</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar relative">
              <AnimatePresence>
                {cart.length > 0 ? (
                  cart.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group p-4 bg-main/5 rounded-2xl border border-border relative"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-5">
                          <h4 className="text-[12px] font-bold text-main truncate">{item.name}</h4>
                          <p className="text-[9px] font-black text-muted/40 uppercase tracking-widest mt-1">{item.sku}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-muted/40 hover:text-brand-crimson transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 p-1.5 bg-black/40 rounded-xl border border-border">
                          <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:text-brand-neonblue transition-colors">
                            <Minus size={13} />
                          </motion.button>
                          <span className="min-w-[20px] text-center text-xs font-black">{item.quantity}</span>
                          <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:text-brand-neonblue transition-colors">
                            <Plus size={13} />
                          </motion.button>
                        </div>
                        <span className="text-sm font-black text-brand-neonblue">₱{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-10 py-16">
                    <Zap size={48} className="mb-4 stroke-[1px] text-brand-neonpurple" />
                    <h4 className="text-[12px] font-black uppercase tracking-[4px] text-muted">Cart is Empty</h4>
                    <p className="text-[10px] mt-2 font-bold leading-tight text-muted">Select a product to begin the sale.</p>
                  </div>
                )}
              </AnimatePresence>

              {/* Success Overlay */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-brand-surface/95 backdrop-blur-2xl z-20 flex flex-col items-center justify-center p-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-24 h-24 rounded-[32px] bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    >
                      <ShieldCheck size={48} className="text-green-500" />
                    </motion.div>
                    <h3 className="text-2xl font-rajdhani font-black tracking-[4px] uppercase mb-4 text-main">Sale Complete</h3>
                    <p className="text-[11px] text-muted font-bold mb-10 leading-relaxed uppercase tracking-widest">
                      {selectedCustomer ? `Logged for ${selectedCustomer.name}` : "Walk-in transaction recorded"}
                    </p>
                    <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 4 }} className="h-full bg-green-500 shadow-[0_0_10px_#22C55E]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-5 md:p-7 bg-brand-muted/5 border-t border-border space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted">
                  <span>Subtotal</span><span className="text-main">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted">
                  <span>VAT (12%)</span><span className="text-main">₱{tax.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-end mb-5">
                  <span className="text-[9px] font-black text-muted uppercase tracking-[3px]">Total Amount</span>
                  <span className="text-2xl md:text-3xl font-rajdhani font-black text-main tracking-widest">₱{grandTotal.toLocaleString()}</span>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: "Cash",  icon: Banknote,    val: "Cash",  color: "text-brand-neonblue",   active: "bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue" },
                    { label: "Card",  icon: CreditCard,  val: "Card",  color: "text-brand-neonpurple", active: "bg-brand-neonpurple/10 border-brand-neonpurple/40 text-brand-neonpurple" },
                    { label: "GCash", icon: Zap,         val: "GCash", color: "text-blue-500",         active: "bg-blue-500/10 border-blue-500/40 text-blue-500" },
                    { label: "Bank",  icon: Banknote,    val: "Bank",  color: "text-green-500",        active: "bg-green-500/10 border-green-500/40 text-green-500" }
                  ].map(pm => (
                    <motion.button
                      key={pm.val}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setPaymentMethod(pm.val)}
                      className={`h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl border text-[8px] font-black uppercase tracking-[1px] transition-all ${
                        paymentMethod === pm.val ? pm.active : "bg-brand-bgbase border-border text-muted hover:text-main"
                      }`}
                    >
                      <pm.icon size={12} />
                      {pm.label}
                    </motion.button>
                  ))}
                </div>

                {/* Proof of payment upload */}
                <AnimatePresence>
                  {(paymentMethod === "GCash" || paymentMethod === "Bank" || paymentMethod === "Card") && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                      <label className="text-[9px] font-black text-muted uppercase tracking-[3px] mb-1.5 block">Proof of Payment</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setProofFile(e.target.files[0])}
                        className="w-full bg-brand-surface border border-border rounded-xl p-2.5 text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-brand-neonblue/10 file:text-brand-neonblue hover:file:bg-brand-neonblue/20"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cash Paid input */}
                <AnimatePresence>
                  {paymentMethod === "Cash" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 text-left">
                      <label className="text-[9px] font-black text-muted uppercase tracking-[3px] mb-1.5 block">Cash Received (₱)</label>
                      <input
                        type="number"
                        min={grandTotal}
                        step="any"
                        value={cashPaid}
                        onChange={e => setCashPaid(e.target.value)}
                        placeholder={`Min: ₱${grandTotal.toLocaleString()}`}
                        className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-sm font-bold text-main outline-none focus:border-brand-neonblue/40"
                      />
                      {cashPaid && parseFloat(cashPaid) >= grandTotal && (
                        <div className="flex justify-between items-center mt-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Change</span>
                          <span className="text-sm font-black text-green-500">₱{(parseFloat(cashPaid) - grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {cashPaid && parseFloat(cashPaid) < grandTotal && (
                        <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase tracking-wider">Amount is insufficient</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={cart.length === 0 || processing || (paymentMethod === "Cash" && (!cashPaid || parseFloat(cashPaid) < grandTotal))}
                  className="w-full h-13 py-4 rounded-full font-black uppercase tracking-[4px] text-[10px] flex items-center justify-center gap-3 transition-all bg-brand-crimson hover:bg-red-700 text-white shadow-[0_12px_30px_rgba(215,38,56,0.15)] disabled:opacity-50 disabled:grayscale"
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>Complete Sale <ArrowRight size={16} /></>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Success Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
           <ReceiptModal
              isOpen={showReceiptModal}
              onClose={() => {
                setShowReceiptModal(false);
                setReceiptData(null);
                setCart([]);
                clearCustomer();
              }}
              receipt={receiptData}
           />
        )}
      </AnimatePresence>
    </div>
  );
}
