"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ThermalReceiptModal } from "@/components/ThermalReceipt";
import {
  FileText,
  Search,
  Eye,
  Printer,
  X,
  AlertCircle,
  Archive,
  Ban,
  Calendar,
  Clock,
  Package,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError } from "@/context/ModalContext";
import { exportToExcel } from "@/lib/excelExport";
import { useTheme } from "@/context/ThemeContext";
import Pagination from "@/components/Pagination";

export default function CustomerWarrantiesPage() {
  const { theme } = useTheme();
  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [viewWarranty, setViewWarranty] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    fetchBranches();
    fetchSalesWarranties();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  const fetchSalesWarranties = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/sales/history?limit=1000"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const json = await res.json();
        const rawSales = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setSales(rawSales);
      }
    } catch (err) {
      console.error("Error fetching sales for warranties:", err);
      showError("Failed to load customer warranties from sales.");
    } finally {
      setLoading(false);
    }
  };

  // Convert each sale into a customer warranty representation
  const warranties = useMemo(() => {
    const now = new Date();
    return sales.map(s => {
      const purchaseDate = new Date(s.createdAt);
      // Standard 1 Year Warranty from purchase date
      const validUntil = new Date(purchaseDate);
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      const items = (s.SaleItems || s.OrderItems || []).filter(
        i => (i.item_type || i.itemType) !== "package_charge"
      );
      const productItems = items.filter(
        i => (i.item_type || i.itemType) !== "service" && !i.Service && !i.serviceId
      );

      const isVoid = s.status === "cancelled" || s.status === "void";
      const isExpired = !isVoid && now > validUntil;
      const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpiringSoon = !isVoid && !isExpired && daysRemaining <= 30;

      let status = "Active";
      if (isVoid) status = "Void";
      else if (isExpired) status = "Expired";
      else if (isExpiringSoon) status = "Expiring Soon";

      const invClean = (s.invoiceNumber || "").replace(/^2026-/, "");
      const warrantyNumber = `WR-${invClean || s.id.toString().slice(-5)}`;

      return {
        id: s.id,
        warrantyNumber,
        invoiceNumber: s.invoiceNumber || `INV-${s.id.toString().slice(-6)}`,
        customerName: s.customerName || s.Customer?.name || "Walk-In Customer",
        branchId: s.branchId,
        branchName: s.Branch?.name || "PC Alley Branch",
        purchaseDate: s.createdAt,
        validUntil: validUntil.toISOString().split("T")[0],
        daysRemaining,
        totalAmount: parseFloat(s.totalAmount || 0),
        items: items.map(it => ({
          product_name: it.productName || it.Product?.name || "Hardware Item",
          quantity: it.quantity || 1,
          unit_price: parseFloat(it.unitPrice || it.price_at_sale || 0),
          subtotal: parseFloat(it.subtotal || 0),
          item_type: it.item_type || "product"
        })),
        productCount: productItems.length || items.length,
        status,
        rawSale: s
      };
    });
  }, [sales]);

  // Filtered Warranties
  const filtered = useMemo(() => {
    return warranties.filter(w => {
      const q = search.toLowerCase();
      const matchesSearch =
        w.customerName.toLowerCase().includes(q) ||
        w.invoiceNumber.toLowerCase().includes(q) ||
        w.warrantyNumber.toLowerCase().includes(q) ||
        w.items.some(it => it.product_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter !== "all" && w.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (branchFilter && String(w.branchId) !== String(branchFilter)) {
        return false;
      }

      return true;
    });
  }, [warranties, search, statusFilter, branchFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: warranties.length,
      active: warranties.filter(w => w.status === "Active" || w.status === "Expiring Soon").length,
      expiring: warranties.filter(w => w.status === "Expiring Soon").length,
      expired: warranties.filter(w => w.status === "Expired").length
    };
  }, [warranties]);

  const STATUS_STYLE = {
    Active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "Expiring Soon": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    Expired: "text-brand-crimson bg-brand-crimson/10 border-brand-crimson/30",
    Void: "text-muted bg-border/30 border-border"
  };

  const handleExport = () => {
    const dataToExport = filtered.map(w => ({
      "Warranty #": w.warrantyNumber,
      "Invoice #": w.invoiceNumber,
      "Customer Name": w.customerName,
      "Branch": w.branchName,
      "Purchase Date": new Date(w.purchaseDate).toLocaleDateString(),
      "Warranty Valid Until": new Date(w.validUntil).toLocaleDateString(),
      "Covered Items Count": w.productCount,
      "Total Amount (₱)": w.totalAmount,
      "Warranty Status": w.status
    }));
    exportToExcel(dataToExport, "Customer_Warranties_Registry");
    showSuccess("Customer warranties exported to Excel");
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="CUSTOMER WARRANTIES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1"
              >
                Hardware Protection &amp; Serial Tracking
              </motion.h2>
              <h1 className="text-2xl font-rajdhani font-black uppercase">
                CUSTOMER <span className="text-brand-neonblue">WARRANTIES</span>
              </h1>
            </div>

            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="px-5 py-2.5 rounded-full border border-border bg-brand-surface hover:bg-brand-surface/80 text-xs font-black uppercase tracking-wider text-muted hover:text-main flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-40"
            >
              <Download size={14} /> Export Warranties
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Warranties", value: stats.total, color: "text-main" },
              { label: "Active Coverage", value: stats.active, color: "text-emerald-400" },
              { label: "Expiring Soon", value: stats.expiring, color: "text-amber-400" },
              { label: "Expired", value: stats.expired, color: "text-brand-crimson" }
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm"
              >
                <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">
                  {s.label}
                </p>
                <p className={`text-2xl font-rajdhani font-black ${s.color}`}>
                  {loading ? "..." : s.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by customer name, invoice #, serial number, product..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-brand-surface border border-border text-main text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Active">Active Coverage</option>
                <option value="Expiring Soon">Expiring Soon (≤30 Days)</option>
                <option value="Expired">Expired</option>
                <option value="Void">Void / Cancelled</option>
              </select>

              {/* Branch Filter */}
              {branches.length > 0 && (
                <select
                  value={branchFilter}
                  onChange={e => {
                    setBranchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-brand-surface border border-border text-main text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[850px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Warranty #</th>
                    <th className="py-4 px-6">Invoice #</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Covered Items</th>
                    <th className="py-4 px-6">Purchase Date</th>
                    <th className="py-4 px-6">Valid Until</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-brand-neonblue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                          Loading customer warranties from sales ledger...
                        </p>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-20 text-center">
                        <FileText className="mx-auto text-main/10 mb-3" size={36} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                          {search ? "No matching customer warranties found" : "No warranties logged yet in sales"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((w, idx) => (
                      <motion.tr
                        key={w.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group"
                      >
                        <td className="py-4 px-6 font-mono text-[11px] font-bold text-brand-neonblue">
                          {w.warrantyNumber}
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-muted font-bold">
                          {w.invoiceNumber}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                              {(w.customerName || "?").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-main block truncate max-w-[180px]">
                                {w.customerName}
                              </span>
                              {w.branchName && (
                                <span className="text-[9px] uppercase font-semibold text-muted/60 block">
                                  {w.branchName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 bg-brand-bgbase border border-border rounded text-[9px] font-black text-muted inline-flex items-center gap-1">
                            <Package size={10} className="text-brand-neonblue" />
                            {w.productCount} Products
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-muted font-bold">
                          {new Date(w.purchaseDate).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>
                        <td className="py-4 px-6 text-xs font-bold">
                          <span className="block text-main">
                            {new Date(w.validUntil).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                          <span
                            className={`text-[9px] font-semibold ${
                              w.status === "Expired"
                                ? "text-brand-crimson"
                                : w.status === "Expiring Soon"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {w.status === "Expired"
                              ? "Expired"
                              : `${w.daysRemaining} days left`}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-rajdhani font-black text-main text-base">
                          ₱{w.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block whitespace-nowrap ${
                              STATUS_STYLE[w.status] || STATUS_STYLE.Active
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewWarranty(w)}
                              className="p-2 rounded-lg bg-brand-bgbase hover:bg-brand-surface border border-border text-muted hover:text-brand-neonblue transition-all"
                              title="View Warranty Certificate & Covered Items"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setPrintReceiptOrder(w.rawSale)}
                              className="p-2 rounded-lg bg-brand-bgbase hover:bg-brand-surface border border-border text-muted hover:text-main transition-all"
                              title="Print Thermal Receipt"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border bg-brand-bgbase/20">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  itemLabel="warranties"
                  onPageChange={(p) => setCurrentPage(p)}
                  className="py-1"
                />
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ── Official Customer Warranty Certificate Modal ── */}
      <AnimatePresence>
        {viewWarranty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewWarranty(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-brand-surface border border-brand-neonblue/20 rounded-[28px] p-6 sm:p-8 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header & Badges */}
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-border/40">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20">
                      {viewWarranty.warrantyNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-brand-bgbase text-muted border border-border">
                      Invoice: {viewWarranty.invoiceNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        STATUS_STYLE[viewWarranty.status] || STATUS_STYLE.Active
                      }`}
                    >
                      {viewWarranty.status}
                    </span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted/60 mb-0.5">
                    Official Warranty Holder
                  </p>
                  <h3
                    className="text-xl font-rajdhani font-black uppercase text-main leading-tight truncate max-w-sm"
                    title={viewWarranty.customerName}
                  >
                    {viewWarranty.customerName}
                  </h3>
                  {viewWarranty.branchName && (
                    <p className="text-[10px] text-brand-neonblue font-bold flex items-center gap-1 mt-0.5">
                      <Building2 size={11} /> {viewWarranty.branchName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setViewWarranty(null)}
                  className="p-2 text-muted hover:text-main rounded-xl hover:bg-brand-bgbase transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Warranty Coverage Dates */}
              <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-2xl bg-brand-bgbase/60 border border-border/40">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
                    <Calendar size={12} className="text-brand-neonblue" /> Coverage Valid Until
                  </p>
                  <p className="text-sm font-rajdhani font-black text-main">
                    {new Date(viewWarranty.validUntil).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                  <p
                    className={`text-[10px] font-bold mt-0.5 ${
                      viewWarranty.status === "Expired"
                        ? "text-brand-crimson"
                        : viewWarranty.status === "Expiring Soon"
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {viewWarranty.status === "Expired"
                      ? "Coverage Expired"
                      : `${viewWarranty.daysRemaining} days remaining`}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
                    <Clock size={12} className="text-brand-neonblue" /> Date of Purchase
                  </p>
                  <p className="text-sm font-rajdhani font-bold text-main">
                    {new Date(viewWarranty.purchaseDate).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                  <p className="text-[10px] text-muted/60 font-medium mt-0.5">
                    1 Year Store Hardware Warranty
                  </p>
                </div>
              </div>

              {/* Covered Products List */}
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-muted/60 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-brand-neonblue" /> Covered Hardware &amp; Serial Numbers ({viewWarranty.items.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {viewWarranty.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-xl bg-brand-bgbase/50 border border-border/30"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border/50 flex items-center justify-center text-brand-neonblue shrink-0">
                          <Package size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-main truncate" title={item.product_name}>
                            {item.product_name}
                          </p>
                          <p className="text-[9px] text-muted font-mono font-bold">
                            Qty: {item.quantity} • Covered under standard warranty
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        Covered
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warranty Policy Reminder */}
              <div className="p-3.5 rounded-2xl bg-brand-bgbase/60 border border-border/40 text-[10px] text-muted leading-relaxed space-y-1 mb-5">
                <p className="font-bold text-main uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-400" /> PC Alley Hardware Warranty Terms:
                </p>
                <p>• 1-Year store replacement / service warranty against factory defects from the invoice date.</p>
                <p>• Physical damage, burns, water damage, or tampered warranty stickers void all warranty coverage.</p>
                <p>• Present this warranty record or official sales invoice when requesting RMA or warranty replacement.</p>
              </div>

              {/* Print Receipt / Slip CTA */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const s = viewWarranty.rawSale;
                    setViewWarranty(null);
                    setPrintReceiptOrder(s);
                  }}
                  className="flex-1 py-3 bg-brand-neonblue hover:bg-brand-neonblue/90 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-neonblue/20"
                >
                  <Printer size={14} /> Print Official Receipt / Slip
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-brand-bgbase hover:bg-brand-surface border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all cursor-pointer"
                >
                  Print Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Thermal Receipt Modal ── */}
      <ThermalReceiptModal
        receipt={printReceiptOrder}
        isOpen={!!printReceiptOrder}
        onClose={() => setPrintReceiptOrder(null)}
      />
    </div>
  );
}
