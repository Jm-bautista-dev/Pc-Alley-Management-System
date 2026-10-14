"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowRight,
  Plus,
  Search,
  Building,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Trash2,
  Eye,
  RefreshCw,
  Send,
  Boxes,
  MapPin,
  Check,
  FileText,
  Filter,
  ShieldCheck,
  Printer,
  Calendar
} from "lucide-react";
import { apiUrl, handleSessionExpired } from "@/lib/api";
import { showSuccess, showError, showWarning, showConfirm } from "@/context/ModalContext";

export default function StockTransfersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Transmittal Slip Modal
  const [transmittalData, setTransmittalData] = useState(null);
  const [isTransmittalOpen, setIsTransmittalOpen] = useState(false);

  // Creation Form State
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [transferNotes, setTransferNotes] = useState("");
  const [autoReceive, setAutoReceive] = useState(false);

  // Inventory available in the selected Source Branch
  const [sourceInventory, setSourceInventory] = useState([]);
  const [loadingSourceInv, setLoadingSourceInv] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [transferItems, setTransferItems] = useState([]); // [{ productId, name, sku, available, quantity }]

  // 1. Auth Guard & Role Check
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const storedToken = localStorage.getItem("token");

      if (!storedUser || !storedToken) {
        handleSessionExpired();
        return;
      }

      if (storedUser.role !== "super_admin" && storedUser.role !== "branch_admin") {
        showError("Access Denied", "Stock transfers are restricted to Super Admin and Branch Admin Managers.");
        router.replace("/dashboard");
        return;
      }

      setCurrentUser(storedUser);
      setIsAuthorized(true);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // 2. Fetch Data
  const fetchTransfers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/stock-transfers"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransfers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load transfers:", e);
    }
  };

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTransfers(), fetchBranches()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransfers();
    setRefreshing(false);
  };

  // 3. Source Branch Inventory Loader (for Create Modal)
  useEffect(() => {
    if (!fromBranchId) {
      setSourceInventory([]);
      return;
    }

    const loadSourceInventory = async () => {
      setLoadingSourceInv(true);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl(`/api/inventory?branch_id=${fromBranchId}&limit=1000`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const raw = await res.json();
          const items = (raw.data || []).map(row => {
            const available = row.quantity || 0;
            // Reserve buffer: low_stock_threshold or default 10 so branch never goes out of stock
            const threshold = (row.low_stock_threshold !== undefined && row.low_stock_threshold !== null && row.low_stock_threshold > 0)
              ? row.low_stock_threshold
              : 10;
            const reserveBuffer = Math.max(1, threshold);
            const maxTransferable = Math.max(0, available - reserveBuffer);

            return {
              id: row.Product?.id || row.product_id,
              name: row.Product?.name || `Product #${row.product_id}`,
              sku: row.Product?.sku || "N/A",
              available,
              reserveBuffer,
              maxTransferable,
              image: row.Product?.image_url || row.Product?.product_image || null
            };
          }).filter(i => i.available > 0);
          setSourceInventory(items);
        }
      } catch (err) {
        console.error("Failed to fetch source branch inventory:", err);
      } finally {
        setLoadingSourceInv(false);
      }
    };

    loadSourceInventory();
    setSelectedProduct(null);
    setItemQuantity(1);
    setTransferItems([]);
  }, [fromBranchId]);

  // Debounced server-assisted live search
  useEffect(() => {
    if (!fromBranchId || !productSearch.trim()) return;

    const timer = setTimeout(async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(
          apiUrl(`/api/inventory?branch_id=${fromBranchId}&search=${encodeURIComponent(productSearch.trim())}&limit=100`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const raw = await res.json();
          const searchedItems = (raw.data || []).map(row => {
            const available = row.quantity || 0;
            const threshold = (row.low_stock_threshold !== undefined && row.low_stock_threshold !== null && row.low_stock_threshold > 0)
              ? row.low_stock_threshold
              : 10;
            const reserveBuffer = Math.max(1, threshold);
            const maxTransferable = Math.max(0, available - reserveBuffer);

            return {
              id: row.Product?.id || row.product_id,
              name: row.Product?.name || `Product #${row.product_id}`,
              sku: row.Product?.sku || "N/A",
              available,
              reserveBuffer,
              maxTransferable,
              image: row.Product?.image_url || row.Product?.product_image || null
            };
          }).filter(i => i.available > 0);

          setSourceInventory(prev => {
            const map = new Map();
            prev.forEach(item => map.set(item.id, item));
            searchedItems.forEach(item => map.set(item.id, item));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error("Live search failed:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearch, fromBranchId]);

  // Open Create Modal helper
  const handleOpenCreateModal = () => {
    if (currentUser?.role === "branch_admin") {
      setFromBranchId(String(currentUser.branch_id));
      // Choose first other branch as default destination
      const other = branches.find(b => b.id !== currentUser.branch_id);
      setToBranchId(other ? String(other.id) : "");
    } else {
      // Super admin defaults
      if (branches.length >= 2) {
        setFromBranchId(String(branches[0].id));
        setToBranchId(String(branches[1].id));
      } else {
        setFromBranchId(branches[0] ? String(branches[0].id) : "");
        setToBranchId("");
      }
    }
    setTransferNotes("");
    setAutoReceive(false);
    setTransferDate(new Date().toISOString().split("T")[0]);
    setTransferItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setProductSearch("");
    setIsProductPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  // Add Item to Transfer List
  const handleAddItem = () => {
    if (!selectedProduct) {
      return showError("Select a Product", "Please choose a product to transfer.");
    }
    const qty = parseInt(itemQuantity, 10);
    if (!qty || qty <= 0) {
      return showError("Invalid Quantity", "Quantity must be at least 1 unit.");
    }
    if (selectedProduct.maxTransferable <= 0) {
      return showError(
        "Cannot Transfer Item",
        `"${selectedProduct.name}" only has ${selectedProduct.available} units in stock, which is at or below the safety reserve buffer (${selectedProduct.reserveBuffer} units). Transferring this item would leave ${getSelectedSourceBranchName()} out of stock.`
      );
    }
    if (qty > selectedProduct.maxTransferable) {
      return showError(
        "Exceeds Transferable Stock",
        `Only ${selectedProduct.maxTransferable} units can be transferred for "${selectedProduct.name}". The source branch (${getSelectedSourceBranchName()}) must retain at least ${selectedProduct.reserveBuffer} units as a safety reserve so it does not run out of stock (available: ${selectedProduct.available}).`
      );
    }

    // Check if already in list
    const existingIndex = transferItems.findIndex(i => i.productId === selectedProduct.id);
    if (existingIndex >= 0) {
      const updated = [...transferItems];
      const newQty = updated[existingIndex].quantity + qty;
      if (newQty > selectedProduct.maxTransferable) {
        return showError(
          "Exceeds Transferable Stock",
          `Total transfer quantity (${newQty}) exceeds the maximum transferable limit (${selectedProduct.maxTransferable} units). Source branch must retain at least ${selectedProduct.reserveBuffer} units.`
        );
      }
      updated[existingIndex].quantity = newQty;
      setTransferItems(updated);
    } else {
      setTransferItems([
        ...transferItems,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          available: selectedProduct.available,
          reserveBuffer: selectedProduct.reserveBuffer,
          maxTransferable: selectedProduct.maxTransferable,
          quantity: qty
        }
      ]);
    }

    setSelectedProduct(null);
    setItemQuantity(1);
    setProductSearch("");
  };

  const handleRemoveItem = (productId) => {
    setTransferItems(transferItems.filter(i => i.productId !== productId));
  };

  // Submit Stock Transfer
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();

    if (!fromBranchId || !toBranchId) {
      return showError("Branch Required", "Please select both source and destination branches.");
    }
    if (String(fromBranchId) === String(toBranchId)) {
      return showError("Invalid Route", "Source and destination branches cannot be the same.");
    }

    // Auto-include currently chosen product if transferItems list is empty
    let itemsToSubmit = [...transferItems];
    if (itemsToSubmit.length === 0 && selectedProduct) {
      const qty = parseInt(itemQuantity, 10);
      if (qty > 0 && qty <= selectedProduct.maxTransferable) {
        itemsToSubmit = [
          {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            available: selectedProduct.available,
            reserveBuffer: selectedProduct.reserveBuffer,
            maxTransferable: selectedProduct.maxTransferable,
            quantity: qty
          }
        ];
      }
    }

    if (itemsToSubmit.length === 0) {
      return showError("No Products Added", "Please choose a product and enter quantity before dispatching.");
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const payload = {
        fromBranchId: parseInt(fromBranchId, 10),
        toBranchId: parseInt(toBranchId, 10),
        transferDate: transferDate || new Date().toISOString().split("T")[0],
        items: itemsToSubmit.map(i => ({
          productId: i.productId,
          quantity: i.quantity
        })),
        notes: transferNotes.trim() || undefined,
        autoReceive: autoReceive
      };

      const res = await fetch(apiUrl("/api/stock-transfers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create transfer.");
      }

      showSuccess(
        "Transfer Dispatched",
        autoReceive
          ? "Stock transfer completed and inventories updated successfully!"
          : "Stock transfer dispatched. Stock will remain in source branch until destination confirms receipt."
      );

      // Prepare transmittal slip record
      const fullRecord = data.transfer || data;
      if (!fullRecord.SourceBranch) {
        fullRecord.SourceBranch = branches.find(b => String(b.id) === String(fromBranchId));
      }
      if (!fullRecord.DestBranch) {
        fullRecord.DestBranch = branches.find(b => String(b.id) === String(toBranchId));
      }
      if (!fullRecord.transferDate) {
        fullRecord.transferDate = transferDate;
      }
      if (!fullRecord.StockTransferItems || fullRecord.StockTransferItems.length === 0) {
        fullRecord.StockTransferItems = itemsToSubmit.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          Product: { id: item.productId, name: item.name, sku: item.sku }
        }));
      }

      setIsCreateModalOpen(false);
      setTransmittalData(fullRecord);
      setIsTransmittalOpen(true);
      fetchTransfers();
    } catch (err) {
      showError("Transfer Failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Complete / Receive Transfer (Only Destination Branch that receives the goods)
  const handleCompleteTransfer = (transfer) => {
    const isDestAdmin = currentUser?.role === "branch_admin" && currentUser.branch_id === transfer.toBranchId;

    if (!isDestAdmin) {
      return showError(
        "Unauthorized",
        `Only the recipient branch (${transfer.DestBranch?.name || "destination branch"}) where the stock is delivered can confirm receipt.`
      );
    }

    showConfirm(
      `Receive Transfer #${transfer.id}?`,
      `Are you sure you want to receive and accept this transfer into ${transfer.DestBranch?.name || "destination branch"}? Stock will be added to local inventory immediately.`,
      async () => {
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(apiUrl(`/api/stock-transfers/${transfer.id}/complete`), {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || data.error || "Failed to complete transfer.");
          }
          showSuccess("Transfer Received", "Stock has been received and added to inventory.");
          if (selectedTransfer?.id === transfer.id) {
            setSelectedTransfer(null);
          }
          fetchTransfers();
        } catch (err) {
          showError("Receipt Failed", err.message);
        }
      }
    );
  };

  // Cancel Pending Transfer
  const handleDeleteTransfer = (transfer) => {
    showConfirm(
      `Cancel Transfer #${transfer.id}?`,
      "Are you sure you want to cancel this pending stock transfer? This action cannot be undone.",
      async () => {
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(apiUrl(`/api/stock-transfers/${transfer.id}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || data.error || "Failed to cancel transfer.");
          }
          showSuccess("Transfer Cancelled", "The pending stock transfer has been removed.");
          if (selectedTransfer?.id === transfer.id) {
            setSelectedTransfer(null);
          }
          fetchTransfers();
        } catch (err) {
          showError("Cancellation Failed", err.message);
        }
      }
    );
  };

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        `#tr-${t.id}`.includes(q) ||
        String(t.id).includes(q) ||
        (t.SourceBranch?.name || "").toLowerCase().includes(q) ||
        (t.DestBranch?.name || "").toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q) ||
        (t.StockTransferItems || []).some(item =>
          (item.Product?.name || "").toLowerCase().includes(q) ||
          (item.Product?.sku || "").toLowerCase().includes(q)
        );

      // Status
      const matchStatus = statusFilter === "All" || t.status === statusFilter;

      // Branch
      const matchBranch =
        branchFilter === "All" ||
        String(t.fromBranchId) === branchFilter ||
        String(t.toBranchId) === branchFilter;

      return matchSearch && matchStatus && matchBranch;
    });
  }, [transfers, search, statusFilter, branchFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter(t => t.status === "Pending").length;
    const completed = transfers.filter(t => t.status === "Completed").length;
    const totalUnits = transfers.reduce((acc, t) => {
      const unitsInTransfer = (t.StockTransferItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      return acc + unitsInTransfer;
    }, 0);

    return { total, pending, completed, totalUnits };
  }, [transfers]);

  const getSelectedSourceBranchName = () => {
    const b = branches.find(item => String(item.id) === String(fromBranchId));
    return b ? b.name : "Source Branch";
  };

  const getSelectedDestBranchName = () => {
    const b = branches.find(item => String(item.id) === String(toBranchId));
    return b ? b.name : "Destination Branch";
  };

  // Products available to choose from in source branch (filtered by search)
  const availableProductOptions = useMemo(() => {
    if (!productSearch.trim()) return sourceInventory.slice(0, 100);
    const q = productSearch.toLowerCase().trim();
    return sourceInventory.filter(
      p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 200);
  }, [sourceInventory, productSearch]);

  if (!isAuthorized) {
    return (
      <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <TopBar title="STOCK TRANSFERS" />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-neonblue/20 border-t-brand-neonblue rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="STOCK TRANSFERS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header Title & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1"
              >
                Multi-Branch Logistics
              </motion.h2>
              <h1 className="text-2xl lg:text-3xl font-rajdhani font-black uppercase tracking-wide">
                STOCK <span className="text-brand-neonblue">TRANSFERS</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-border bg-brand-surface hover:bg-main/5 text-main/70 hover:text-main transition-colors flex items-center gap-2 text-xs font-semibold"
                title="Refresh Transfers"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin text-brand-neonblue" : ""} />
                <span className="hidden md:inline">Refresh</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-neonblue hover:bg-brand-neonblue/90 text-black font-rajdhani font-bold text-sm tracking-wider uppercase transition-all shadow-lg shadow-brand-neonblue/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>New Transfer</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40">Total Transfers</p>
                <div className="w-7 h-7 rounded-lg bg-main/5 flex items-center justify-center text-main/60">
                  <ArrowLeftRight size={14} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-rajdhani font-black text-main">{stats.total}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-yellow-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-yellow-500/80">Pending Receipt</p>
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Clock size={14} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-rajdhani font-black text-yellow-500">{stats.pending}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-brand-surface border border-green-500/20 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-green-500/80">Completed</p>
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-rajdhani font-black text-green-500">{stats.completed}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-brand-surface border border-brand-neonblue/20 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue/80">Units Handled</p>
                <div className="w-7 h-7 rounded-lg bg-brand-neonblue/10 flex items-center justify-center text-brand-neonblue">
                  <Boxes size={14} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-rajdhani font-black text-brand-neonblue">{stats.totalUnits}</p>
            </motion.div>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-main/40" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by transfer ID, branch name, or product SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-border rounded-xl text-xs text-main placeholder:text-main/30 focus:outline-none focus:border-brand-neonblue transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Status Filter */}
              <div className="flex rounded-xl bg-brand-surface border border-border p-1 text-xs">
                {["All", "Pending", "Completed"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      statusFilter === st
                        ? "bg-brand-neonblue text-black font-bold shadow-sm"
                        : "text-main/60 hover:text-main"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Branch Filter */}
              {branches.length > 0 && (
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  className="px-3 py-2 bg-brand-surface border border-border rounded-xl text-xs text-main focus:outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                >
                  <option value="All">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-main/40 gap-3">
                <div className="w-8 h-8 border-2 border-brand-neonblue/20 border-t-brand-neonblue rounded-full animate-spin" />
                <p className="text-xs uppercase font-mono tracking-wider">Loading stock transfers...</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center text-brand-neonblue mb-4">
                  <ArrowLeftRight size={28} />
                </div>
                <h3 className="text-lg font-rajdhani font-bold uppercase mb-1">No Stock Transfers Found</h3>
                <p className="text-xs text-main/40 max-w-sm mb-6">
                  {transfers.length === 0
                    ? "Start by dispatching your first stock transfer between branches."
                    : "No transfer records match your current search or filters."}
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-neonblue text-black font-rajdhani font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-md transition-all"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Create Transfer</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-black uppercase tracking-[2px] text-main/40 bg-main/[0.02]">
                      <th className="py-3.5 px-4">Transfer #</th>
                      <th className="py-3.5 px-4">Route (From ➔ To)</th>
                      <th className="py-3.5 px-4">Items / Units</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredTransfers.map(transfer => {
                      const itemCount = transfer.StockTransferItems?.length || 0;
                      const totalUnits = (transfer.StockTransferItems || []).reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0
                      );
                      const isPending = transfer.status === "Pending";
                      const isSuperAdmin = currentUser?.role === "super_admin";
                      const isDestAdmin =
                        currentUser?.role === "branch_admin" &&
                        currentUser.branch_id === transfer.toBranchId;
                      const isSourceAdmin =
                        currentUser?.role === "branch_admin" &&
                        currentUser.branch_id === transfer.fromBranchId;
                      const canReceive = isPending && isDestAdmin;
                      const canCancel = isPending && (isSuperAdmin || isSourceAdmin);

                      return (
                        <tr
                          key={transfer.id}
                          className="hover:bg-main/[0.02] transition-colors group"
                        >
                          {/* Transfer ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-neonblue">
                            #TR-{transfer.id}
                          </td>

                          {/* Route */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-main truncate max-w-[130px]">
                                {transfer.SourceBranch?.name || "HQ / Source"}
                              </span>
                              <ArrowRight size={13} className="text-brand-neonblue shrink-0" />
                              <span className="font-semibold text-brand-neonblue truncate max-w-[130px]">
                                {transfer.DestBranch?.name || "Destination"}
                              </span>
                            </div>
                          </td>

                          {/* Items Preview */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-main/5 border border-border font-mono text-[11px] font-bold text-main">
                                {itemCount} {itemCount === 1 ? "Product" : "Products"}
                              </span>
                              <span className="text-main/50 text-[11px]">
                                ({totalUnits} {totalUnits === 1 ? "unit" : "units"})
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                Pending Receipt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                                <Check size={11} className="stroke-[3]" />
                                Completed
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-main/50 font-mono text-[11px]">
                            {transfer.transferDate ? (
                              <div>
                                <span className="font-bold text-main/80">{transfer.transferDate}</span>
                                <span className="block text-[9px] text-main/40 font-sans">Scheduled Date</span>
                              </div>
                            ) : (
                              new Date(transfer.createdAt).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Receive & Confirm Delivery Button (Only Destination Branch can receive) */}
                              {canReceive ? (
                                <button
                                  onClick={() => handleCompleteTransfer(transfer)}
                                  className="px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                                  title="Confirm Delivery & Receive Stock"
                                >
                                  <Check size={12} className="stroke-[3]" />
                                  <span>Confirm Received</span>
                                </button>
                              ) : isPending ? (
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/20">
                                  <Clock size={10} className="text-yellow-500" />
                                  <span>Awaiting {transfer.DestBranch?.name || "Destination"}</span>
                                </span>
                              ) : null}

                              {/* Print Transmittal Slip */}
                              <button
                                onClick={() => {
                                  setTransmittalData(transfer);
                                  setIsTransmittalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-border hover:bg-brand-neonblue/10 hover:border-brand-neonblue/30 text-main/60 hover:text-brand-neonblue transition-colors"
                                title="Print Transmittal Slip"
                              >
                                <Printer size={14} />
                              </button>

                              {/* View Details */}
                              <button
                                onClick={() => setSelectedTransfer(transfer)}
                                className="p-1.5 rounded-lg border border-border hover:bg-main/5 text-main/60 hover:text-main transition-colors"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Cancel */}
                              {canCancel && (
                                <button
                                  onClick={() => handleDeleteTransfer(transfer)}
                                  className="p-1.5 rounded-lg border border-brand-crimson/20 hover:bg-brand-crimson/10 text-brand-crimson transition-colors"
                                  title="Cancel Transfer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW STOCK TRANSFER */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-main/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center text-brand-neonblue">
                    <ArrowLeftRight size={16} />
                  </div>
                  <div>
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wide">
                      DISPATCH <span className="text-brand-neonblue">STOCK TRANSFER</span>
                    </h3>
                    <p className="text-[11px] text-main/40">Transfer inventory products between store branches</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-main/40 hover:text-main hover:bg-main/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitTransfer} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                {/* 1. Branch Routing & Schedule Selector */}
                <div className="p-4 rounded-xl bg-brand-bgbase border border-border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* From Branch */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/50 mb-1.5">
                        Source Branch (From)
                      </label>
                      {currentUser?.role === "branch_admin" ? (
                        <div className="px-3 py-2 rounded-xl bg-brand-surface border border-border text-xs font-semibold text-main flex items-center justify-between">
                          <span>{getSelectedSourceBranchName()}</span>
                          <span className="text-[10px] text-brand-neonblue font-mono font-bold uppercase tracking-wider">
                            Your Branch
                          </span>
                        </div>
                      ) : (
                        <select
                          value={fromBranchId}
                          onChange={e => setFromBranchId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-border text-xs text-main focus:outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                          required
                        >
                          {branches.map(b => (
                            <option key={b.id} value={String(b.id)}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* To Branch */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/50 mb-1.5">
                        Destination Branch (To)
                      </label>
                      <select
                        value={toBranchId}
                        onChange={e => setToBranchId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-border text-xs text-main focus:outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                        required
                      >
                        <option value="" disabled>Select destination branch...</option>
                        {branches
                          .filter(b => String(b.id) !== String(fromBranchId))
                          .map(b => (
                            <option key={b.id} value={String(b.id)}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Transfer Date Picker */}
                  <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/50 mb-1 flex items-center gap-1.5">
                        <Calendar size={12} className="text-brand-neonblue" />
                        <span>Transfer Date / Scheduled Delivery</span>
                      </label>
                      <p className="text-[10px] text-main/40 font-mono">Date this shipment is dispatched for delivery</p>
                    </div>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={e => setTransferDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-brand-surface border border-border text-xs font-mono text-main focus:outline-none focus:border-brand-neonblue transition-colors cursor-pointer w-full sm:w-48"
                      required
                    />
                  </div>
                </div>

                {/* 2. Add Products Section */}
                <div className="p-4 rounded-xl bg-brand-bgbase border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-main/50">
                      Add Items to Transfer
                    </span>
                    {loadingSourceInv && (
                      <span className="text-[10px] text-brand-neonblue font-mono flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" /> Fetching inventory...
                      </span>
                    )}
                  </div>

                  {sourceInventory.length === 0 && !loadingSourceInv ? (
                    <p className="text-xs text-main/40 italic py-2">
                      No stock currently available in {getSelectedSourceBranchName()} to transfer.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Search Filter Box & Interactive Product Picker */}
                      <div>
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-main/40" />
                          <input
                            type="text"
                            value={productSearch}
                            onFocus={() => setIsProductPickerOpen(true)}
                            onChange={e => {
                              setProductSearch(e.target.value);
                              setIsProductPickerOpen(true);
                            }}
                            placeholder="Type product name or SKU (e.g. 'mouse', 'ssd', 'ram')..."
                            className="w-full pl-9 pr-24 py-2.5 bg-brand-surface border border-border rounded-xl text-xs text-main placeholder:text-main/30 focus:outline-none focus:border-brand-neonblue transition-colors"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {productSearch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProductSearch("");
                                  setIsProductPickerOpen(false);
                                }}
                                className="p-1 rounded text-main/40 hover:text-main hover:bg-main/5"
                                title="Clear search"
                              >
                                <X size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsProductPickerOpen(prev => !prev)}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-main/5 hover:bg-main/10 text-main/70 border border-border/50 transition-colors"
                            >
                              {isProductPickerOpen ? "Hide" : "Browse"}
                            </button>
                          </div>
                        </div>

                        {/* Interactive Floating / Expandable Product Picker */}
                        {isProductPickerOpen && (
                          <div className="mt-2 rounded-xl border border-brand-neonblue/30 bg-brand-surface p-2 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar space-y-1.5">
                            <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 text-[10px] font-mono text-main/50">
                              <span>
                                {availableProductOptions.length} PRODUCTS FOUND IN {getSelectedSourceBranchName().toUpperCase()}
                              </span>
                              <span className="text-brand-neonblue font-bold">CLICK ITEM TO SELECT</span>
                            </div>

                            {availableProductOptions.length === 0 ? (
                              <div className="p-4 text-center text-xs text-main/40 italic">
                                No products found matching "{productSearch}" in {getSelectedSourceBranchName()}
                              </div>
                            ) : (
                              availableProductOptions.map(prod => {
                                const isSelected = selectedProduct?.id === prod.id;
                                return (
                                  <div
                                    key={prod.id}
                                    onClick={() => {
                                      setSelectedProduct(prod);
                                      setItemQuantity(prod.maxTransferable > 0 ? 1 : 0);
                                      setIsProductPickerOpen(false);
                                    }}
                                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                      isSelected
                                        ? "bg-brand-neonblue/10 border-brand-neonblue/40"
                                        : "bg-brand-bgbase/60 border-border hover:border-brand-neonblue/40 hover:bg-main/5"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-main truncate">{prod.name}</p>
                                      <p className="text-[10px] font-mono text-main/50">SKU: {prod.sku}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-main/5 border border-border text-main/70">
                                        Stock: <strong className="text-main">{prod.available}</strong>
                                      </span>
                                      {prod.maxTransferable > 0 ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-neonblue/10 border border-brand-neonblue/30 text-brand-neonblue">
                                          Transferable: {prod.maxTransferable}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                                          Reserve Limit (0)
                                        </span>
                                      )}
                                      {isSelected && <Check size={14} className="text-brand-neonblue shrink-0" />}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Product Selector Dropdown (Quick alternative) */}
                      <div>
                        <select
                          value={selectedProduct ? String(selectedProduct.id) : ""}
                          onChange={e => {
                            const found = sourceInventory.find(p => String(p.id) === e.target.value);
                            setSelectedProduct(found || null);
                            if (found) {
                              setItemQuantity(found.maxTransferable > 0 ? 1 : 0);
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-brand-surface border border-border text-xs text-main focus:outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                        >
                          <option value="">
                            -- {selectedProduct ? `Selected: ${selectedProduct.name}` : `Or choose from dropdown (${availableProductOptions.length} products listed)`} --
                          </option>
                          {availableProductOptions.map(prod => (
                            <option key={prod.id} value={String(prod.id)}>
                              [{prod.sku}] {prod.name} — Stock: {prod.available} | Max Transfer: {prod.maxTransferable} {prod.maxTransferable === 0 ? "(Zero Transferable - Below Reserve)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Item Stock & Validation Card */}
                      {selectedProduct && (
                        <div className="p-4 rounded-xl bg-brand-surface border border-brand-neonblue/30 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                            <div>
                              <p className="text-sm font-bold text-main">{selectedProduct.name}</p>
                              <p className="text-[10px] text-main/50 font-mono">SKU: {selectedProduct.sku}</p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-main/5 text-main/60 self-start sm:self-auto">
                              Source: {getSelectedSourceBranchName()}
                            </span>
                          </div>

                          {/* 3 Metric Badges: Available, Safety Reserve, Max Transferable */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2.5 rounded-lg bg-main/5 border border-border">
                              <p className="text-[9px] uppercase font-mono text-main/50 mb-0.5">Available Stock</p>
                              <p className="text-base font-rajdhani font-black text-main">{selectedProduct.available} units</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-[9px] uppercase font-mono text-yellow-500/80 mb-0.5">Safety Reserve</p>
                              <p className="text-base font-rajdhani font-black text-yellow-500">{selectedProduct.reserveBuffer} units</p>
                              <p className="text-[8px] text-yellow-500/60 font-mono">Keeps branch in stock</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/20">
                              <p className="text-[9px] uppercase font-mono text-brand-neonblue/80 mb-0.5">Max Transferable</p>
                              <p className="text-base font-rajdhani font-black text-brand-neonblue">{selectedProduct.maxTransferable} units</p>
                              <p className="text-[8px] text-brand-neonblue/60 font-mono">Max allowable limit</p>
                            </div>
                          </div>

                          {/* Zero Transferable Warning */}
                          {selectedProduct.maxTransferable <= 0 ? (
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs flex items-center gap-2">
                              <AlertTriangle size={15} className="shrink-0" />
                              <span>
                                <strong>Transfer Restricted:</strong> Current stock ({selectedProduct.available} units) is at or below the safety reserve buffer ({selectedProduct.reserveBuffer} units). Transferring this product would cause {getSelectedSourceBranchName()} to go out of stock.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-1">
                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <span className="text-xs font-semibold text-main/70 shrink-0">Transfer Quantity:</span>

                                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                  <button
                                    type="button"
                                    onClick={() => setItemQuantity(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border text-main hover:bg-main/5 flex items-center justify-center font-bold"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={selectedProduct.maxTransferable}
                                    value={itemQuantity}
                                    onChange={e => setItemQuantity(parseInt(e.target.value || "0", 10))}
                                    className={`w-20 px-2 py-1.5 bg-brand-bgbase border rounded-lg text-xs font-mono text-center text-main focus:outline-none ${
                                      itemQuantity > selectedProduct.maxTransferable || itemQuantity <= 0
                                        ? "border-brand-crimson text-brand-crimson"
                                        : "border-border focus:border-brand-neonblue"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setItemQuantity(q => Math.min(selectedProduct.maxTransferable, q + 1))}
                                    className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border text-main hover:bg-main/5 flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setItemQuantity(selectedProduct.maxTransferable)}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-neonblue/10 hover:bg-brand-neonblue/20 text-brand-neonblue border border-brand-neonblue/30 text-[10px] font-mono font-bold uppercase transition-colors"
                                  >
                                    MAX ({selectedProduct.maxTransferable})
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleAddItem}
                                  disabled={itemQuantity <= 0 || itemQuantity > selectedProduct.maxTransferable}
                                  className="w-full sm:w-auto sm:ml-auto px-4 py-2 rounded-xl bg-brand-neonblue disabled:opacity-30 disabled:cursor-not-allowed text-black font-rajdhani font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <Plus size={14} className="stroke-[3]" />
                                  <span>Add Item</span>
                                </button>
                              </div>

                              {/* Realtime Live Validation Feedback */}
                              {itemQuantity > selectedProduct.maxTransferable ? (
                                <p className="text-[11px] text-brand-crimson font-semibold flex items-center gap-1.5 bg-brand-crimson/10 border border-brand-crimson/20 p-2 rounded-lg">
                                  <AlertTriangle size={14} className="shrink-0" />
                                  <span>
                                    Exceeds limit! Only <strong>{selectedProduct.maxTransferable} units</strong> can be transferred. {getSelectedSourceBranchName()} must keep a safety reserve of <strong>{selectedProduct.reserveBuffer} units</strong> to not go out of stock.
                                  </span>
                                </p>
                              ) : itemQuantity > 0 ? (
                                <p className="text-[11px] text-green-500 flex items-center gap-1.5 font-mono">
                                  <Check size={13} className="stroke-[3]" />
                                  <span>
                                    {selectedProduct.available - itemQuantity} units will remain in {getSelectedSourceBranchName()} (Safe & In Stock).
                                  </span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-main/40 font-mono">
                                  Enter a transfer quantity between 1 and {selectedProduct.maxTransferable} units.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transfer Items Summary Table */}
                  {transferItems.length > 0 && (
                    <div className="mt-4 border border-border rounded-xl overflow-hidden bg-brand-surface">
                      <div className="p-2.5 bg-main/[0.02] border-b border-border flex items-center justify-between text-[10px] font-black uppercase tracking-[2px] text-main/50">
                        <span>Items to Dispatch ({transferItems.length})</span>
                        <span>
                          Total Units: {transferItems.reduce((acc, i) => acc + i.quantity, 0)}
                        </span>
                      </div>
                      <div className="divide-y divide-border max-h-48 overflow-y-auto custom-scrollbar">
                        {transferItems.map(item => (
                          <div key={item.productId} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="flex-1 pr-2">
                              <p className="font-semibold text-main truncate max-w-xs">{item.name}</p>
                              <p className="text-[10px] text-main/40 font-mono">
                                SKU: {item.sku} • Stock: {item.available} units (Reserve: {item.reserveBuffer})
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-mono font-bold text-brand-neonblue">
                                  {item.quantity} {item.quantity === 1 ? "unit" : "units"}
                                </span>
                                <p className="text-[10px] text-green-500 font-mono">
                                  {item.available - item.quantity} remaining
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="p-1 rounded text-brand-crimson hover:bg-brand-crimson/10 transition-colors"
                                title="Remove"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Transfer Notes */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/50 mb-1.5">
                    Transfer Notes / Reason (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                    placeholder="e.g. Stock rebalancing, high weekend demand, or customer requested item..."
                    className="w-full px-3 py-2 rounded-xl bg-brand-bgbase border border-border text-xs text-main placeholder:text-main/30 focus:outline-none focus:border-brand-neonblue transition-colors resize-none"
                  />
                </div>

                {/* 4. Auto-Complete Option */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-main/[0.02] border border-border">
                  <input
                    type="checkbox"
                    id="autoReceive"
                    checked={autoReceive}
                    onChange={e => setAutoReceive(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-brand-neonblue focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="autoReceive" className="text-xs text-main cursor-pointer select-none">
                    <span className="font-semibold">Complete immediately</span> (Stock will be added to the destination branch right away without requiring confirmation)
                  </label>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                  <div className="text-[11px] text-main/50">
                    {transferItems.length > 0 ? (
                      <span className="text-brand-neonblue font-mono font-bold">
                        {transferItems.length} {transferItems.length === 1 ? "item" : "items"} staged ({transferItems.reduce((acc, i) => acc + i.quantity, 0)} total units)
                      </span>
                    ) : selectedProduct ? (
                      <span className="text-brand-neonblue font-mono">
                        Ready to transfer: <strong>{selectedProduct.name}</strong> ({itemQuantity} units)
                      </span>
                    ) : (
                      <span className="text-main/40 italic">Select a product above to stage for transfer</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-main/70 hover:text-main hover:bg-main/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (transferItems.length === 0 && !selectedProduct)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-neonblue disabled:opacity-40 disabled:cursor-not-allowed text-black font-rajdhani font-bold text-xs uppercase tracking-wider hover:opacity-90 shadow-md transition-all"
                    >
                      <Send size={13} />
                      <span>{submitting ? "Dispatching..." : "Dispatch Transfer"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: VIEW TRANSFER DETAILS */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-main/[0.02]">
                <div>
                  <h3 className="font-rajdhani font-black text-lg uppercase tracking-wide">
                    TRANSFER <span className="text-brand-neonblue">#TR-{selectedTransfer.id}</span>
                  </h3>
                  <p className="text-[11px] text-main/40">
                    Logged on {new Date(selectedTransfer.createdAt).toLocaleString("en-PH")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="p-1.5 rounded-lg text-main/40 hover:text-main hover:bg-main/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">

                {/* Status & Route Card */}
                <div className="p-4 rounded-xl bg-brand-bgbase border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-main/40">Status</span>
                    {selectedTransfer.status === "Pending" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        Pending Receipt
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-brand-surface border border-border/60">
                    <div>
                      <p className="text-[10px] text-main/40 uppercase font-mono">Source</p>
                      <p className="text-sm font-bold text-main">{selectedTransfer.SourceBranch?.name || "HQ"}</p>
                    </div>
                    <ArrowRight size={18} className="text-brand-neonblue" />
                    <div className="text-right">
                      <p className="text-[10px] text-main/40 uppercase font-mono">Destination</p>
                      <p className="text-sm font-bold text-brand-neonblue">{selectedTransfer.DestBranch?.name || "Target"}</p>
                    </div>
                  </div>

                  {selectedTransfer.notes && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] text-main/40 uppercase font-mono mb-0.5">Notes:</p>
                      <p className="text-xs text-main/80 italic">{selectedTransfer.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items Breakdown Table */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[2px] text-main/50 mb-2">
                    Transferred Products Breakdown
                  </h4>
                  <div className="border border-border rounded-xl overflow-hidden bg-brand-bgbase">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border text-[9px] font-black uppercase tracking-[2px] text-main/40 bg-main/[0.02]">
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(selectedTransfer.StockTransferItems || []).map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-2.5 px-3 font-semibold text-main">
                              {item.Product?.name || `Product #${item.productId}`}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-main/50">
                              {item.Product?.sku || "N/A"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-neonblue">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-main/[0.02]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransmittalData(selectedTransfer);
                      setIsTransmittalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-main/5 border border-border text-xs font-bold text-main flex items-center gap-1.5 transition-colors"
                  >
                    <Printer size={13} className="text-brand-neonblue" />
                    <span>Print Transmittal</span>
                  </button>

                  {selectedTransfer.status === "Pending" && (
                    currentUser?.role === "branch_admin" && currentUser?.branch_id === selectedTransfer.toBranchId ? (
                      <button
                        onClick={() => handleCompleteTransfer(selectedTransfer)}
                        className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-rajdhani font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Check size={14} className="stroke-[3]" />
                        <span>Accept & Receive Stock</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-yellow-500 font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Clock size={13} />
                        <span>Awaiting delivery confirmation from {selectedTransfer.DestBranch?.name || "destination branch"}</span>
                      </span>
                    )
                  )}
                </div>

                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-main/70 hover:text-main hover:bg-main/5 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: PRINTABLE STOCK TRANSFER TRANSMITTAL SLIP */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isTransmittalOpen && transmittalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Top Control Bar (Hidden during print) */}
              <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-border bg-main/[0.03]">
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-brand-neonblue" />
                  <span className="font-rajdhani font-bold text-sm uppercase tracking-wider text-main">
                    Stock Transfer Transmittal Slip
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-neonblue hover:bg-brand-neonblue/90 text-black font-rajdhani font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                  >
                    <Printer size={13} className="stroke-[2.5]" />
                    <span>Print Transmittal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransmittalOpen(false);
                      setTransmittalData(null);
                    }}
                    className="p-1.5 rounded-lg text-main/40 hover:text-main hover:bg-main/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Document Body */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white text-black font-sans text-xs">
                <div id="printable-transmittal" className="space-y-6">
                  {/* Slip Header */}
                  <div className="border-b-2 border-black pb-4 flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-black uppercase font-rajdhani">
                        PC ALLEY COMPUTER STORE
                      </h1>
                      <p className="text-[11px] font-semibold text-gray-700 tracking-wide uppercase">
                        Official Stock Transfer Transmittal Slip
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Accompanies inventory shipments during inter-branch logistics transfer
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="inline-block border border-black px-3 py-1 rounded bg-gray-50">
                        <span className="text-[9px] uppercase font-mono block text-gray-500 font-bold">Transfer Ref #</span>
                        <span className="text-base font-black font-mono text-black">#TR-{transmittalData.id}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 font-mono">
                        Date: <strong>{transmittalData.transferDate || (transmittalData.createdAt ? new Date(transmittalData.createdAt).toLocaleDateString("en-PH") : new Date().toLocaleDateString("en-PH"))}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Logistics Routing Summary */}
                  <div className="grid grid-cols-2 gap-4 border border-gray-300 rounded-lg p-3.5 bg-gray-50/50">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                        ORIGIN (SOURCE BRANCH)
                      </span>
                      <p className="text-sm font-bold text-black">
                        {transmittalData.SourceBranch?.name || "Main Warehouse / HQ"}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {transmittalData.SourceBranch?.location || "Branch Address on Record"}
                      </p>
                    </div>

                    <div className="border-l border-gray-300 pl-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                        DESTINATION (RECIPIENT BRANCH)
                      </span>
                      <p className="text-sm font-bold text-black">
                        {transmittalData.DestBranch?.name || "Target Branch"}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {transmittalData.DestBranch?.location || "Branch Address on Record"}
                      </p>
                    </div>
                  </div>

                  {/* Itemized Table of Transferred Goods */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-black mb-1.5">
                      ITEMIZED INVENTORY MANIFEST
                    </h3>
                    <table className="w-full border-collapse border border-gray-400 text-left text-xs">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-400 text-[10px] uppercase font-black">
                          <th className="py-2 px-2.5 border-r border-gray-300 w-10 text-center">#</th>
                          <th className="py-2 px-2.5 border-r border-gray-300 w-28">SKU Code</th>
                          <th className="py-2 px-2.5 border-r border-gray-300">Product Designation & Details</th>
                          <th className="py-2 px-2.5 border-r border-gray-300 w-24 text-center">Qty Sent</th>
                          <th className="py-2 px-2.5 w-24 text-center">Verified [✓]</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {(transmittalData.StockTransferItems || []).map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-2 px-2.5 border-r border-gray-300 text-center font-mono text-[11px] text-gray-600">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 border-r border-gray-300 font-mono text-[11px] font-bold text-black">
                              {item.Product?.sku || "N/A"}
                            </td>
                            <td className="py-2 px-2.5 border-r border-gray-300 font-semibold text-black">
                              {item.Product?.name || `Product #${item.productId}`}
                            </td>
                            <td className="py-2 px-2.5 border-r border-gray-300 text-center font-mono font-black text-black">
                              {item.quantity} units
                            </td>
                            <td className="py-2 px-2.5 text-center text-gray-400 font-mono text-[10px]">
                              [ &nbsp;&nbsp;&nbsp; ]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-black bg-gray-50 font-black">
                          <td colSpan={3} className="py-2 px-2.5 text-right uppercase text-[10px]">
                            Total Quantity To Transfer:
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono text-sm border-r border-gray-300 text-black">
                            {(transmittalData.StockTransferItems || []).reduce((sum, it) => sum + (it.quantity || 0), 0)} units
                          </td>
                          <td className="py-2 px-2.5 text-center text-[10px] text-gray-500 font-mono">
                            {(transmittalData.StockTransferItems || []).length} items
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Transfer Notes / Reason if provided */}
                  {transmittalData.notes && (
                    <div className="border border-gray-300 rounded p-2.5 bg-gray-50/50 text-[11px]">
                      <span className="font-bold uppercase text-[9px] text-gray-500 block">Transfer Reason / Remarks:</span>
                      <p className="italic text-gray-800">{transmittalData.notes}</p>
                    </div>
                  )}

                  {/* Legal Terms Notice */}
                  <div className="border-t border-dashed border-gray-300 pt-2 text-[9px] text-gray-500 leading-tight">
                    <p>
                      <strong>IMPORTANT NOTICE:</strong> This transmittal slip must travel with the physical goods. The recipient branch must verify item condition and quantity upon arrival before confirming delivery in the system. Any discrepancies must be noted on this document.
                    </p>
                  </div>

                  {/* Three-Party Official Signatures Section */}
                  <div className="pt-4 grid grid-cols-3 gap-6 text-center text-[10px]">
                    {/* 1. Sender */}
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-black uppercase">DISPATCHED BY</p>
                      <p className="text-gray-500 text-[9px] mb-4">Source Branch Staff / Manager</p>
                      <div className="border-b border-gray-400 h-6 mb-1"></div>
                      <p className="text-[9px] text-gray-400">Signature Over Printed Name / Date</p>
                    </div>

                    {/* 2. Courier / Logistics */}
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-black uppercase">CARRIER / DELIVERED BY</p>
                      <p className="text-gray-500 text-[9px] mb-4">Driver / Transport Logistics</p>
                      <div className="border-b border-gray-400 h-6 mb-1"></div>
                      <p className="text-[9px] text-gray-400">Signature Over Printed Name / Date</p>
                    </div>

                    {/* 3. Recipient */}
                    <div className="border-t border-black pt-2">
                      <p className="font-bold text-black uppercase">RECEIVED & VERIFIED BY</p>
                      <p className="text-gray-500 text-[9px] mb-4">Destination Branch Staff / Manager</p>
                      <div className="border-b border-gray-400 h-6 mb-1"></div>
                      <p className="text-[9px] text-gray-400">Signature Over Printed Name / Date</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Screen view only) */}
              <div className="no-print flex items-center justify-between px-6 py-3.5 border-t border-border bg-main/[0.02]">
                <p className="text-[11px] text-main/50">
                  Print this transmittal to attach with the goods for shipment.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransmittalOpen(false);
                      setTransmittalData(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-main/70 hover:text-main hover:bg-main/5 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-neonblue text-black font-rajdhani font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-md"
                  >
                    <Printer size={13} className="stroke-[2.5]" />
                    <span>Print Transmittal Slip</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-transmittal, #printable-transmittal * {
            visibility: visible !important;
          }
          #printable-transmittal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
