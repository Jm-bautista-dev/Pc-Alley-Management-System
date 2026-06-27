"use client";

import { useState, useEffect, useRef } from "react";
import { ThermalReceiptContent, ThermalReceiptModal } from "@/components/ThermalReceipt";
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
// Success / Receipt Modal
// ─────────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, onClose, receipt }) {
  const [showThermalPreview, setShowThermalPreview] = useState(false);

  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.unitPrice || item.price_at_sale || 0) * item.quantity, 0);
  const grandTotal = subtotal * 1.12;

  return (
    <>
      {/* ── Thermal Receipt Preview Modal ── */}
      <ThermalReceiptModal
        receipt={receipt}
        isOpen={showThermalPreview}
        onClose={() => setShowThermalPreview(false)}
      />

      {/* ── Payment Success Modal ── */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-brand-surface border border-border rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-main/5 flex items-center justify-center hover:bg-brand-crimson hover:text-white transition-all text-muted z-50"
            title="Close Modal"
          >
            <X size={16} />
          </button>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {/* SUCCESS VIEW */}
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
              <div className="w-full max-w-sm bg-brand-bgbase/40 border border-border rounded-2xl p-5 mb-6 text-left space-y-3">
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

              {/* Receipt Preview CTA */}
              <div className="w-full max-w-sm bg-brand-bgbase/20 border border-dashed border-brand-neonblue/30 rounded-2xl p-4 text-center">
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">🧾 Thermal Receipt Ready</p>
                <button
                  onClick={() => setShowThermalPreview(true)}
                  className="w-full py-3 bg-brand-neonblue text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 hover:opacity-80 transition-all shadow"
                >
                  <Printer size={13} /> Preview &amp; Print Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons Footer */}
          <div className="p-5 bg-brand-muted/5 border-t border-border flex gap-3">
            <button
              onClick={() => setShowThermalPreview(true)}
              className="flex-1 py-3 px-5 border border-border rounded-xl font-black uppercase tracking-wider text-[10px] text-muted hover:text-main hover:bg-brand-bgbase/40 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={13} /> View Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-5 bg-brand-crimson hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all"
            >
              New Transaction
            </button>
          </div>
        </motion.div>
      </div>
    </>
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

  // Add customer modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: "", email: "", phone: "", address: "", branchId: ""
  });

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
    try {
      const savedCart = localStorage.getItem("pc_alley_pos_cart");
      const savedCustomerName = localStorage.getItem("pc_alley_pos_customer");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
        localStorage.removeItem("pc_alley_pos_cart");
      }
      if (savedCustomerName) {
        setCustomerQuery(savedCustomerName);
        if (savedCustomerName !== "Walk-in Customer" && savedCustomerName !== "") {
          setSelectedCustomer({ name: savedCustomerName });
        } else {
          setSelectedCustomer(null);
        }
        localStorage.removeItem("pc_alley_pos_customer");
      }
    } catch (err) {
      console.error("Failed to restore cart draft:", err);
    }
  }, []);

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

  const handleCancelAddCustomer = async () => {
    const isDirty = customerFormData.name.trim() || 
                    customerFormData.email.trim() || 
                    customerFormData.phone.trim() || 
                    customerFormData.address.trim() || 
                    customerFormData.branchId;

    if (isDirty) {
      const confirmed = await showConfirm(
        "Discard Customer Details?",
        "Are you sure you want to cancel? All input fields will be cleared."
      );
      if (!confirmed) return;
    }
    
    setCustomerFormData({ name: "", email: "", phone: "", address: "", branchId: "" });
    setIsCustomerModalOpen(false);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!customerFormData.name.trim()) {
      showError("Name is required");
      return;
    }
    if (customerFormData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerFormData.email)) {
        showError("Please enter a valid email address.");
        return;
      }
    }
    if (customerFormData.phone.trim()) {
      const digits = customerFormData.phone.replace(/[^0-9]/g, '');
      if (digits.length !== 11) {
        showError("Phone number must contain exactly 11 digits.");
        return;
      }
      if (!digits.startsWith("09")) {
        showError("Phone number must start with 09.");
        return;
      }
      if (/^(.)\1+$/.test(digits)) {
        showError("Phone number cannot consist of only repeating identical digits.");
        return;
      }
    }
    setCustomerSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/customers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...customerFormData,
          branchId: customerFormData.branchId || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Customer added successfully");
        setIsCustomerModalOpen(false);
        setCustomerFormData({ name: "", email: "", phone: "", address: "", branchId: "" });
        if (data) {
          selectCustomer(data);
        }
      } else {
        showError(data.message || "Failed to add customer");
      }
    } catch {
      showError("Network error");
    } finally {
      setCustomerSubmitting(false);
    }
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

  const handleSaveDraft = () => {
    if (cart.length === 0) return;
    try {
      const currentDrafts = JSON.parse(localStorage.getItem("pc_alley_pos_drafts") || "[]");
      const newDraft = {
        id: Date.now(),
        customer_name: selectedCustomer?.name || customerQuery || "Walk-in Customer",
        items: cart,
        savedAt: new Date().toISOString()
      };
      currentDrafts.push(newDraft);
      localStorage.setItem("pc_alley_pos_drafts", JSON.stringify(currentDrafts));
      showSuccess("Cart saved to drafts.");
      setCart([]);
      clearCustomer();
      setCashPaid("");
    } catch (err) {
      showError("Failed to save draft.");
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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
                  </div>

                  {/* Add Customer Button */}
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="w-10 h-10 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/30 flex items-center justify-center text-brand-neonblue hover:bg-brand-neonblue/20 transition-all shrink-0"
                    title="Add Customer"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {selectedCustomer && (
                  <div className="px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl flex items-center gap-2">
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
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Cash",  icon: Banknote,    val: "Cash",  color: "text-brand-neonblue",   active: "bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue" },
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
                   {(paymentMethod === "GCash" || paymentMethod === "Bank") && (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                       <label className="text-[9px] font-black text-muted uppercase tracking-[3px] mb-1.5 block">Proof of Payment</label>
                       {proofFile ? (
                         <div className="flex items-center justify-between p-3 bg-brand-surface border border-border rounded-xl">
                           <span className="text-xs text-main truncate font-medium max-w-[200px]" title={proofFile.name}>
                             📎 {proofFile.name}
                           </span>
                           <button
                             type="button"
                             onClick={() => setProofFile(null)}
                             className="p-1 rounded-lg text-muted hover:text-brand-crimson transition-colors"
                             title="Remove proof of payment"
                           >
                             <X size={14} />
                           </button>
                         </div>
                       ) : (
                         <input
                           type="file"
                           accept="image/*"
                           onChange={e => setProofFile(e.target.files[0] || null)}
                           className="w-full bg-brand-surface border border-border rounded-xl p-2.5 text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-brand-neonblue/10 file:text-brand-neonblue hover:file:bg-brand-neonblue/20"
                         />
                       )}
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

                <div className="flex gap-2 mb-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSaveDraft}
                    disabled={cart.length === 0 || processing}
                    className="w-full h-11 py-3 rounded-full font-black uppercase tracking-[2px] text-[9px] flex items-center justify-center gap-2 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    Save Draft
                  </motion.button>
                </div>

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

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCancelAddCustomer}
              className="absolute inset-0 bg-brand-bgbase/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-brand-surface border border-border rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-muted/40 mb-1">New Record</p>
                  <h2 className="text-lg font-rajdhani font-black uppercase">Add Customer</h2>
                </div>
                <button
                  onClick={handleCancelAddCustomer}
                  className="p-2 hover:bg-brand-bgbase rounded-xl text-muted hover:text-main transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-5">
                {[
                  { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. Juan dela Cruz" },
                  { label: "Email Address", key: "email", type: "email", placeholder: "e.g. juan@email.com" },
                  { label: "Phone Number", key: "phone", type: "tel", placeholder: "e.g. 09xxxxxxxxx" },
                  { label: "Address", key: "address", type: "text", placeholder: "e.g. 123 Main St, Manila" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-muted/50 mb-2">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={customerFormData[key]}
                      onChange={e => {
                        let val = e.target.value;
                        if (key === "phone") {
                          val = val.replace(/[^0-9]/g, '');
                        }
                        setCustomerFormData(prev => ({ ...prev, [key]: val }));
                      }}
                      maxLength={key === "phone" ? 11 : undefined}
                      placeholder={placeholder}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue/40 transition-colors font-bold placeholder:opacity-30"
                    />
                  </div>
                ))}

                {/* Branch selector — super admin only */}
                {user?.role === "super_admin" && branches.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-muted/50 mb-2">Branch</label>
                    <select
                      value={customerFormData.branchId || ""}
                      onChange={e => setCustomerFormData(prev => ({ ...prev, branchId: e.target.value }))}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue/40 transition-colors font-bold"
                    >
                      <option value="">No Branch (Walk-in)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelAddCustomer}
                    className="flex-1 h-11 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customerSubmitting}
                    className="flex-1 h-11 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/30 text-[11px] font-black uppercase tracking-widest text-brand-neonblue hover:bg-brand-neonblue/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {customerSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {customerSubmitting ? "Saving..." : "Add Customer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
