"use client";

import { useState, useEffect, useRef } from "react";
import { ThermalReceiptModal } from "@/components/ThermalReceipt";
import Sidebar from "@/components/Sidebar";
import { useLayout } from "@/context/LayoutContext";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useTheme } from "@/context/ThemeContext";
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
  ChevronLeft,
  Settings,
  Globe,
  LayoutGrid,
  Cpu,
  Layers,
  HardDrive,
  MousePointer,
  Keyboard,
  Headphones,
  Laptop,
  Check,
  ShoppingBag,
  ArrowLeft,
  Info,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";

// ─────────────────────────────────────────────────────────────────
// TRANSLATION DICTIONARY
// ─────────────────────────────────────────────────────────────────
const t = {
  en: {
    kioskTitle: "PC ALLEY KIOSK",
    tagline: "Touch to Order • Fast & Self-Service",
    searchPlaceholder: "Search parts, specs or SKUs...",
    allCategories: "All Products",
    itemCount: "Items",
    subtotal: "Subtotal",
    tax: "VAT (12%)",
    discount: "Discount",
    discountType: "Type",
    discountPercent: "Percent (%)",
    discountFixed: "Fixed (₱)",
    discountValue: "Discount Value",
    totalAmount: "Total Amount",
    addToOrder: "Add to Order",
    reviewOrder: "Review Order",
    checkout: "Checkout",
    paymentTitle: "Select Payment Method",
    payCounter: "Pay at Counter",
    payGcash: "GCash Transfer",
    payBank: "Bank Transfer",
    cashReceived: "Cash Received (₱)",
    insufficientCash: "Amount is insufficient",
    change: "Change",
    completeSale: "Complete Order",
    saveDraft: "Save Draft",
    successTitle: "Order Confirmed!",
    successText: "Please proceed to the cashier counter to complete payment or wait for your receipt.",
    newOrder: "Start New Order",
    emptyCartTitle: "Your order is empty",
    emptyCartSub: "Browse categories above and tap items to start ordering.",
    variants: "Choose Edition",
    addons: "Select Extras",
    notes: "Special Requests / Notes",
    notesPlaceholder: "e.g., BIOS update required, fragile packaging...",
    searchBtn: "Search",
    exitBtn: "Exit to Dashboard",
    loyaltyTitle: "Customer Loyalty (Optional)",
    loyaltyPlaceholder: "Search customer by name...",
    newCustomer: "New Customer",
    backToMenu: "Back to Menu",
    quantity: "Quantity",
    confirmAdded: "Added to Order!",
    receiptSlip: "Proof of Payment",
    uploadReceipt: "Upload Receipt Screenshot",
    selected: "Selected",
    activeBranch: "Branch",
    accentColor: "Theme Accent",
    themeYellow: "Golden Yellow",
    themeRed: "Classic Red",
    themeBlue: "Tech Blue",
    themeGreen: "Matcha Green",
    settingsTitle: "Kiosk Configuration",
    outOfStock: "Out of Stock",
    stockThreshold: "Stock threshold reached",
    warranty: "Warranty Plan",
    customization: "Customize Your Order",
    insufficientStock: "Insufficient stock",
    customize: "Customize",
    addedToOrder: "Added to Order",
    itemsInOrder: "in order"
  },
  tg: {
    kioskTitle: "PC ALLEY KIOSK",
    tagline: "Pindutin para Mag-order • Mabilis at Self-Service",
    searchPlaceholder: "Maghanap ng pyesa o SKU...",
    allCategories: "Lahat ng Produkto",
    itemCount: "Mga Item",
    subtotal: "Subtotal",
    tax: "VAT (12%)",
    discount: "Diskwento",
    discountType: "Uri",
    discountPercent: "Porsyento (%)",
    discountFixed: "Halaga (₱)",
    discountValue: "Halaga ng Diskwento",
    totalAmount: "Kabuuang Halaga",
    addToOrder: "Idagdag sa Order",
    reviewOrder: "Suriin ang Order",
    checkout: "Magbayad",
    paymentTitle: "Pumili ng Paraan ng Pagbayad",
    payCounter: "Magbayad sa Counter",
    payGcash: "GCash Transfer",
    payBank: "Bank Transfer",
    cashReceived: "Natanggap na Cash (₱)",
    insufficientCash: "Kulang ang halaga",
    change: "Sukli",
    completeSale: "Kumpletuhin ang Order",
    saveDraft: "I-save ang Draft",
    successTitle: "Kumpirmado na ang Order!",
    successText: "Mangyaring pumunta sa counter para magbayad o hintayin ang inyong resibo.",
    newOrder: "Bagong Order",
    emptyCartTitle: "Walang laman ang iyong order",
    emptyCartSub: "Pumili sa mga kategorya sa itaas at mag-tap ng mga item para magsimula.",
    variants: "Pumili ng Uri",
    addons: "Pumili ng Karagdagan",
    notes: "Mga Espesyal na Kahilingan",
    notesPlaceholder: "hal. kailangan ng BIOS update, ingatan ang pag-pack...",
    searchBtn: "Maghanap",
    exitBtn: "Bumalik sa Dashboard",
    loyaltyTitle: "Loyalty ng Customer (Opsyonal)",
    loyaltyPlaceholder: "Maghanap ng customer sa pangalan...",
    newCustomer: "Bagong Customer",
    backToMenu: "Bumalik sa Menu",
    quantity: "Dami",
    confirmAdded: "Nai-dagdag na!",
    receiptSlip: "Katibayan ng Pagbabayad",
    uploadReceipt: "I-upload ang Resibo",
    selected: "Napili",
    activeBranch: "Sangay",
    accentColor: "Kulay ng Tema",
    themeYellow: "Gintong Dilaw",
    themeRed: "Klasikong Pula",
    themeBlue: "Tech Asul",
    themeGreen: "Matcha Berde",
    settingsTitle: "Pag-ayos ng Kiosk",
    outOfStock: "Kulang sa Stock",
    stockThreshold: "Abot na ang limitasyon ng stock",
    warranty: "Planong Warranty",
    customization: "I-customize ang Order",
    insufficientStock: "Kulang ang stock",
    customize: "Pumili",
    addedToOrder: "Nai-dagdag na",
    itemsInOrder: "nasa order"
  }
};

// ─────────────────────────────────────────────────────────────────
// PRODUCT OPTIONS GENERATOR
// ─────────────────────────────────────────────────────────────────
const getProductOptions = (categoryName) => {
  const cat = (categoryName || "").toLowerCase();
  
  if (cat.includes("gpu") || cat.includes("graphics")) {
    return {
      variants: [
        { id: "v_std", name: "Standard Reference Edition" },
        { id: "v_oc", name: "Overclocked (OC) Factory Edition" },
      ],
      addons: [
        { id: "a_paste", name: "Arctic MX-6 Thermal Paste Applied" },
        { id: "a_bracket", name: "Anti-Sag GPU Support Bracket" },
        { id: "a_warranty", name: "3-Year Premium Extended Warranty" },
      ]
    };
  }
  
  if (cat.includes("cpu") || cat.includes("processor")) {
    return {
      variants: [
        { id: "v_box", name: "Retail Box (with stock cooler)" },
        { id: "v_tray", name: "Tray / OEM (liquid-cooling setup)" },
      ],
      addons: [
        { id: "a_paste", name: "Thermal Grizzly Kryonaut Applied" },
        { id: "a_cooler", name: "Store Assembly Liquid Cooler Installation" },
      ]
    };
  }

  if (cat.includes("motherboard") || cat.includes("board")) {
    return {
      variants: [
        { id: "v_std", name: "Standard BIOS Profile" },
        { id: "v_flash", name: "BIOS Flashed to Latest CPU Compat version" },
      ],
      addons: [
        { id: "a_battery", name: "Backup CMOS Battery Pack" },
        { id: "a_wifi", name: "High-Gain WiFi Antenna Upgrade" },
      ]
    };
  }

  // General Fallback Options
  return {
    variants: [
      { id: "v_std", name: "Standard Retail Package" },
      { id: "v_premium", name: "Open-Box Tested Quality Certification" }
    ],
    addons: [
      { id: "a_warranty", name: "Extended 3-Year Store Protection Plan" },
      { id: "a_install", name: "Full Professional Hardware Installation" },
    ]
  };
};

const getCategoryIcon = (categoryName) => {
  const name = (categoryName || "").toLowerCase();
  if (name.includes("gpu") || name.includes("graphics")) return Cpu;
  if (name.includes("cpu") || name.includes("processor")) return Cpu;
  if (name.includes("motherboard") || name.includes("board")) return Layers;
  if (name.includes("ram") || name.includes("memory")) return Layers;
  if (name.includes("storage") || name.includes("ssd") || name.includes("hdd")) return HardDrive;
  if (name.includes("power") || name.includes("psu")) return Zap;
  if (name.includes("peripheral") || name.includes("mouse") || name.includes("keyboard")) return MousePointer;
  if (name.includes("laptop")) return Laptop;
  if (name.includes("accessory") || name.includes("cable")) return Headphones;
  return Package;
};

// ─────────────────────────────────────────────────────────────────
// SUCCESS / RECEIPT MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────
function ReceiptModal({ isOpen, onClose, receipt }) {
  const [showThermalPreview, setShowThermalPreview] = useState(false);

  const items = receipt.SaleItems || receipt.OrderItems || [];
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.unitPrice || item.price_at_sale || 0) * item.quantity, 0);
  const grandTotal = subtotal * 1.12;

  return (
    <>
      <ThermalReceiptModal
        receipt={receipt}
        isOpen={showThermalPreview}
        onClose={() => setShowThermalPreview(false)}
      />

      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-brand-surface text-main border border-brand-border rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-brand-panel flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-brand-muted z-50"
            title="Close"
          >
            <X size={16} />
          </button>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="text-center py-6 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 text-green-500 shadow-md"
              >
                <CheckCircle2 size={44} className="stroke-[2px]" />
              </motion.div>

              <h2 className="text-2xl font-rajdhani font-black text-main uppercase tracking-wider mb-1">
                Order Successful
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-muted/70 mb-8">
                Transaction Completed
              </p>

              <div className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl p-5 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Invoice Number</span>
                  <span className="font-mono font-bold text-main">{receipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Total Amount</span>
                  <span className="font-black text-main text-sm">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Branch</span>
                  <span className="font-bold text-main">{receipt.Branch?.name || "PC Alley Main"}</span>
                </div>
                {receipt.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Amount Paid</span>
                      <span className="font-bold text-main">₱{parseFloat(receipt.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Change</span>
                      <span className="font-bold text-green-500">₱{parseFloat(receipt.changeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-full max-w-sm bg-brand-panel border border-dashed border-brand-border rounded-2xl p-4 text-center">
                <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mb-3">🧾 Thermal Receipt Ready</p>
                <button
                  onClick={() => setShowThermalPreview(true)}
                  className="w-full py-3 bg-brand-neonblue text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow"
                >
                  <Printer size={13} /> Preview &amp; Print Receipt
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 bg-brand-panel border-t border-brand-border flex gap-3">
            <button
              onClick={() => setShowThermalPreview(true)}
              className="flex-1 py-3 px-5 border border-brand-border bg-brand-surface rounded-xl font-black uppercase tracking-wider text-[10px] text-main hover:bg-brand-hover transition-all flex items-center justify-center gap-2"
            >
              <Printer size={13} /> View Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-5 bg-green-600 dark:bg-green-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all"
            >
              New Transaction
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SALES COMPONENT (KIOSK REDESIGN)
// ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { user } = useAuthGuard();
  const { theme } = useTheme(); // Inherit active application theme
  
  // Theme state — always start with "yellow" to match SSR, then sync from localStorage after mount
  const [accentColor, setAccentColor] = useState("yellow");
  
  // Language state
  const [language, setLanguage] = useState("en"); // "en" or "tg"

  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [productSearch, setProductSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashPaid, setCashPaid] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Branch Selector states
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Receipt modal states
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Customer loyalty lookup state
  const [customerQuery, setCustomerQuery] = useState("");
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

  // Redesign Kiosk specific states
  const [selectedProductDetail, setSelectedProductDetail] = useState(null); // dynamic option configurator target
  const [customQuantity, setCustomQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customNotes, setCustomNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false); // checkmark popup animation
  const [isReviewOpen, setIsReviewOpen] = useState(false); // bottom-sheet review cart
  const [checkoutStep, setCheckoutStep] = useState("review"); // review -> payment
  const [searchOpen, setSearchOpen] = useState(false); // search overlay switcher
  const [settingsOpen, setSettingsOpen] = useState(false); // gear options modal

  // Discount state — reads from localStorage shared with Discounts page
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null); // full discount object | null

  // Load discounts from localStorage (same store as Discounts page)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("pc_alley_discounts") || "[]");
      setAvailableDiscounts(stored);
    } catch { /* silent */ }
  }, []);

  // Quick Add visual feedback states
  const [toastMessage, setToastMessage] = useState("");
  const [pulsingProductId, setPulsingProductId] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Color Theme definitions (fully theme-aware)
  const themeMap = {
    yellow: {
      primaryBg: "bg-amber-400 dark:bg-amber-500",
      hoverBg: "hover:bg-amber-500 dark:hover:bg-amber-600",
      activeBg: "active:bg-amber-600 dark:active:bg-amber-700",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-400 dark:border-amber-500",
      lightBg: "bg-amber-50 dark:bg-amber-950/20",
      focusRing: "focus:ring-amber-300 dark:focus:ring-amber-800",
      badgeBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
      primaryText: "text-neutral-900 dark:text-white",
    },
    red: {
      primaryBg: "bg-red-600 dark:bg-red-700",
      hoverBg: "hover:bg-red-700 dark:hover:bg-red-800",
      activeBg: "active:bg-red-800 dark:active:bg-red-900",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-600 dark:border-red-700",
      lightBg: "bg-red-50 dark:bg-red-950/20",
      focusRing: "focus:ring-red-400 dark:focus:ring-red-850",
      badgeBg: "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 border-red-200 dark:border-red-900/50",
      primaryText: "text-white",
    },
    blue: {
      primaryBg: "bg-blue-600 dark:bg-blue-700",
      hoverBg: "hover:bg-blue-700 dark:hover:bg-blue-800",
      activeBg: "active:bg-blue-800 dark:active:bg-blue-900",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-600 dark:border-blue-700",
      lightBg: "bg-blue-50 dark:bg-blue-950/20",
      focusRing: "focus:ring-blue-400 dark:focus:ring-blue-850",
      badgeBg: "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
      primaryText: "text-white",
    },
    green: {
      primaryBg: "bg-emerald-600 dark:bg-emerald-700",
      hoverBg: "hover:bg-emerald-700 dark:hover:bg-emerald-800",
      activeBg: "active:bg-emerald-800 dark:active:bg-emerald-900",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-600 dark:border-emerald-700",
      lightBg: "bg-emerald-50 dark:bg-emerald-950/20",
      focusRing: "focus:ring-emerald-400 dark:focus:ring-emerald-850",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
      primaryText: "text-white",
    }
  };
  const activeTheme = themeMap[accentColor] || themeMap.yellow;

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

  useEffect(() => {
    return () => {
      clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Sync accent color from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("pc_alley_kiosk_accent");
    if (saved && saved !== accentColor) {
      setAccentColor(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccentChange = (color) => {
    setAccentColor(color);
    localStorage.setItem("pc_alley_kiosk_accent", color);
  };

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

  // Derived category & product filter lists
  const categories = ["All", ...new Set(inventory.map(i => i.Product?.Category?.name).filter(Boolean))];
  
  const filteredInventory = inventory.filter(item => {
    const matchCat = activeCategory === "All" || item.Product?.Category?.name === activeCategory;
    const matchSearch = !productSearch ||
      item.Product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.Product?.sku?.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // QUICK ADD Selection (adds 1 to cart instantly)
  const handleQuickAdd = (item) => {
    if (item.quantity <= 0) {
      showError(t[language].outOfStock);
      return;
    }

    const existingIndex = cart.findIndex(c => c.id === item.product_id);
    
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingIndex].quantity + 1;
      if (newQuantity > item.quantity) {
        showError(t[language].stockThreshold);
        return;
      }
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: newQuantity
      };
      setCart(updatedCart);
    } else {
      const cartItem = {
        id: item.product_id,
        name: item.Product.name,
        price: parseFloat(item.Product.price),
        sku: item.Product.sku,
        quantity: 1,
        maxStock: item.quantity,
        selectedVariant: "Standard",
        selectedAddons: [],
        notes: "",
        selectionSummary: "Standard Options"
      };
      setCart([...cart, cartItem]);
    }

    // Trigger visual pulse feedback
    setPulsingProductId(item.product_id);
    setTimeout(() => setPulsingProductId(null), 300);

    // Visual Toast confirmation
    const confirmMsg = `${t[language].addedToOrder}: ${item.Product.name}`;
    setToastMessage(confirmMsg);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 1500);
  };

  // Open dynamic customization modal with selections prefilled
  const handleProductCustomize = (item) => {
    if (item.quantity <= 0) {
      showError(t[language].outOfStock);
      return;
    }
    const options = getProductOptions(item.Product?.Category?.name);
    setSelectedProductDetail(item);
    
    const cartItem = cart.find(c => c.id === item.product_id);
    if (cartItem) {
      setCustomQuantity(cartItem.quantity);
      const foundVariant = options.variants.find(v => v.name === cartItem.selectedVariant) || options.variants[0];
      setSelectedVariant(foundVariant || null);
      const foundAddons = options.addons.filter(a => cartItem.selectedAddons.includes(a.name));
      setSelectedAddons(foundAddons);
      setCustomNotes(cartItem.notes);
    } else {
      setCustomQuantity(1);
      setSelectedVariant(options.variants[0] || null);
      setSelectedAddons([]);
      setCustomNotes("");
    }
  };

  // Called when submitting edits inside product customizer modal
  const handleAddToOrder = () => {
    if (!selectedProductDetail) return;
    const item = selectedProductDetail;

    if (customQuantity > item.quantity) {
      showError(t[language].insufficientStock);
      return;
    }

    const existingIndex = cart.findIndex(c => c.id === item.product_id);
    
    let details = [];
    if (selectedVariant && selectedVariant.name !== "Standard Retail Package" && selectedVariant.name !== "Standard Reference Edition") {
      details.push(selectedVariant.name);
    }
    if (selectedAddons.length > 0) {
      details.push(...selectedAddons.map(a => a.name));
    }
    const selectionSummary = details.length > 0 
      ? `Variant: ${selectedVariant?.name || "Std"} | Add-ons: ${selectedAddons.map(a => a.name).join(", ")}${customNotes ? ` | Note: ${customNotes}` : ""}`
      : customNotes ? `Note: ${customNotes}` : "Standard Options";

    const cartItem = {
      id: item.product_id,
      name: item.Product.name,
      price: parseFloat(item.Product.price),
      sku: item.Product.sku,
      quantity: customQuantity,
      maxStock: item.quantity,
      selectedVariant: selectedVariant?.name || "Standard",
      selectedAddons: selectedAddons.map(a => a.name),
      notes: customNotes,
      selectionSummary: selectionSummary
    };

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: customQuantity, // direct set from modal customizer
        selectedVariant: cartItem.selectedVariant,
        selectedAddons: cartItem.selectedAddons,
        notes: cartItem.notes,
        selectionSummary: cartItem.selectionSummary
      };
      setCart(updatedCart);
    } else {
      setCart([...cart, cartItem]);
    }

    // Play circular check animation
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedProductDetail(null);
    }, 1200);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.quantity + delta);
      if (newQty > item.maxStock) {
        showError(t[language].insufficientStock);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const subtotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = (() => {
    if (!selectedDiscount) return 0;
    const isPercent = selectedDiscount.type === "Percentage (%)";
    if (isPercent) {
      const pct = Math.min(Math.max(Number(selectedDiscount.value) || 0, 0), 100);
      return subtotal * (pct / 100);
    }
    return Math.min(Math.max(Number(selectedDiscount.value) || 0, 0), subtotal);
  })();
  const discountedSubtotal = subtotal - discountAmount;
  const tax        = discountedSubtotal * 0.12;
  const grandTotal = discountedSubtotal + tax;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0 || processing) return;
    
    if (paymentMethod === "Cash" && (!cashPaid || parseFloat(cashPaid) < grandTotal)) {
      showError(t[language].insufficientCash);
      return;
    }
    setProcessing(true);
    const token = localStorage.getItem("token");

    // Construct unified items metadata note to save in DB
    const itemsNotes = cart.map(item => 
      `${item.name} (Qty: ${item.quantity}) [${item.selectionSummary}]`
    ).join("\n");
    
    const combinedNotes = customNotes 
      ? `${itemsNotes}\nGeneral Notes: ${customNotes}`
      : itemsNotes;

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
        notes:         combinedNotes,
        items:         cart.map(item => ({ product_id: item.id, quantity: item.quantity }))
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

        // Increment uses count for the applied discount in localStorage
        if (selectedDiscount) {
          try {
            const stored = JSON.parse(localStorage.getItem("pc_alley_discounts") || "[]");
            const updated = stored.map(d =>
              d.id === selectedDiscount.id ? { ...d, uses: (d.uses || 0) + 1 } : d
            );
            localStorage.setItem("pc_alley_discounts", JSON.stringify(updated));
            setAvailableDiscounts(updated);
          } catch { /* silent */ }
        }

        setReceiptData(data);
        setShowReceiptModal(true);
        setProofFile(null);
        setCashPaid("");
        setIsReviewOpen(false);
        setCheckoutStep("review");
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
      showSuccess(language === "en" ? "Cart saved to drafts." : "Nai-save ang order sa drafts.");
      setCart([]);
      clearCustomer();
      setCashPaid("");
      setSelectedDiscount(null);
      setIsReviewOpen(false);
    } catch (err) {
      showError(language === "en" ? "Failed to save draft." : "Sawi sa pag-save ng draft.");
    }
  };

  const handleToggleAddon = (addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Enrich dynamic product receipt text before display print modal
  const displayReceipt = receiptData ? {
    ...receiptData,
    SaleItems: receiptData.SaleItems?.map(item => {
      const cartItem = cart.find(c => c.id === item.productId);
      if (cartItem) {
        let details = [];
        if (cartItem.selectedVariant && cartItem.selectedVariant !== "Standard" && cartItem.selectedVariant !== "Standard Retail Package" && cartItem.selectedVariant !== "Standard Reference Edition") {
          details.push(cartItem.selectedVariant);
        }
        if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
          details.push(...cartItem.selectedAddons);
        }
        if (details.length > 0) {
          return {
            ...item,
            productName: `${item.productName} (${details.join(", ")})`
          };
        }
      }
      return item;
    })
  } : null;

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    setCart([]);
    clearCustomer();
    setSelectedDiscount(null);
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-sans transition-colors duration-300 select-none">
      <Sidebar />
      
      {/* ─────────────────────────────────────────────────────────────────
          KIOSK MAIN CONTENT AREA (Occupies remaining width)
          ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-brand-bgbase">
      
      {/* ─────────────────────────────────────────────────────────────────
          KIOSK HEADER (McDonald's Style)
          ───────────────────────────────────────────────────────────────── */}
      <header className="h-20 shrink-0 bg-brand-surface border-b border-brand-border px-6 flex items-center justify-between shadow-sm dark:shadow-none relative z-30 font-sans">
        {/* Left: Kiosk Logo + Name */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${activeTheme.primaryBg} shadow-md`}>
            <ShoppingBag size={24} className={activeTheme.primaryText} />
          </div>
          <div>
            <h1 className="text-lg font-rajdhani font-black tracking-wider uppercase m-0 leading-none">
              {t[language].kioskTitle}
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-brand-muted mt-1 font-bold">
              {t[language].tagline}
            </p>
          </div>
        </div>

        {/* Center: Language selector */}
        <div className="flex bg-brand-bgbase p-1.5 rounded-full border border-brand-border">
          <button
            onClick={() => setLanguage("en")}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all uppercase ${
              language === "en" ? `${activeTheme.primaryBg} ${activeTheme.primaryText} shadow-sm` : "text-brand-muted hover:text-main"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("tg")}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all uppercase ${
              language === "tg" ? `${activeTheme.primaryBg} ${activeTheme.primaryText} shadow-sm` : "text-brand-muted hover:text-main"
            }`}
          >
            PH
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-11 h-11 rounded-full bg-brand-panel border border-brand-border hover:bg-brand-hover flex items-center justify-center text-main transition-colors"
            title="Search Catalog"
          >
            <Search size={18} />
          </button>

          {/* Settings / Gear Switcher */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-11 h-11 rounded-full bg-brand-panel border border-brand-border hover:bg-brand-hover flex items-center justify-center text-main transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Floating cart top indicator */}
          <button
            onClick={() => {
              if (cart.length > 0) {
                setCheckoutStep("review");
                setIsReviewOpen(true);
              }
            }}
            className="px-5 h-11 bg-brand-surface text-main border border-brand-border rounded-full flex items-center gap-2 hover:bg-brand-hover active:scale-95 transition-all text-xs font-black tracking-wider shadow-sm dark:shadow-none"
          >
            <ShoppingCart size={15} />
            <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            <span className="opacity-40">|</span>
            <span className={activeTheme.text}>₱{subtotal.toLocaleString()}</span>
          </button>
        </div>
      </header>

      {/* QUICK ADD ALERT FLOATING TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-24 left-1/2 z-[100] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 border border-brand-border/20"
          >
            <CheckCircle2 size={15} className="text-green-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-0 right-0 bg-brand-surface border-b border-brand-border shadow-md dark:shadow-none z-40 p-4 animate-fade-in"
          >
            <div className="max-w-2xl mx-auto relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                autoFocus
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder={t[language].searchPlaceholder}
                className="w-full pl-12 pr-10 py-3 bg-brand-bgbase border border-brand-border rounded-full text-sm font-bold text-main focus:outline-none focus:border-brand-neonblue/40 transition-all placeholder:text-brand-muted/50"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          CATEGORY TABS (STICKY BAR BELOW HEADER)
          ───────────────────────────────────────────────────────────────── */}
      <nav className="shrink-0 bg-brand-surface border-b border-brand-border shadow-sm dark:shadow-none relative z-20 flex gap-2 overflow-x-auto py-3 px-6 no-scrollbar">
        {categories.map(cat => {
          const Icon = getCategoryIcon(cat);
          const isSelected = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat)}
              className={`h-11 px-6 rounded-full border text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 ${
                isSelected
                  ? `${activeTheme.primaryBg} ${activeTheme.primaryText} ${activeTheme.border} shadow-md dark:shadow-none`
                  : "bg-brand-surface border-brand-border text-brand-muted hover:bg-brand-hover hover:text-main"
              }`}
            >
              <Icon size={14} />
              <span>{cat === "All" ? t[language].allCategories : cat}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* ─────────────────────────────────────────────────────────────────
          PRODUCT GRID AREA (SCROLLABLE)
          ───────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar bg-brand-bgbase">
        {loading ? (
          <div className="w-full py-40 flex flex-col items-center justify-center opacity-40">
            <Loader2 className="animate-spin mb-4 text-main" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-muted">Loading Products…</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="w-full py-32 flex flex-col items-center justify-center opacity-40 text-center">
            <Package size={64} className="text-brand-muted mb-4 stroke-[1px]" />
            <h4 className="text-[12px] font-black uppercase tracking-[3px] text-brand-muted">No matching products</h4>
            <p className="text-xs text-brand-muted mt-1">Try searching a different item name or SKU</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-24">
            {filteredInventory.map((item) => {
              const hasImage = item.Product?.product_image || item.Product?.image_url;
              const formattedPrice = parseFloat(item.Product.price).toLocaleString();
              const isLowStock = item.quantity <= 5;
              const isOutOfStock = item.quantity <= 0;
              
              // Find matching cart item to display visual badges
              const cartItem = cart.find(c => c.id === item.product_id);
              
              // Friendly Description Fallback
              const descText = item.Product.description 
                ? item.Product.description 
                : `High-quality ${item.Product.name} from our ${item.Product.Category?.name || "POS"} catalog. Certified genuine product.`;

              return (
                <motion.div
                  key={item.product_id}
                  animate={pulsingProductId === item.product_id ? { scale: 0.96, opacity: 0.9 } : { scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleQuickAdd(item)}
                  className={`bg-brand-surface rounded-3xl border ${
                    isOutOfStock 
                      ? "opacity-60 border-brand-border cursor-not-allowed" 
                      : isLowStock 
                        ? "border-red-500/30 dark:border-red-500/50 shadow-red-50/20" 
                        : "border-brand-border hover:border-brand-neonblue/20 dark:hover:border-brand-neonblue/40"
                  } p-4 flex flex-col justify-between cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all relative overflow-hidden`}
                >
                  <div className="relative">
                    {/* Cart Item Quantity Badge Overlay */}
                    {cartItem && (
                      <div className={`absolute top-2.5 left-2.5 z-30 ${activeTheme.primaryBg} ${activeTheme.primaryText} text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md`}>
                        +{cartItem.quantity} {t[language].itemsInOrder}
                      </div>
                    )}

                    {/* Image Box */}
                    <div className="w-full h-36 bg-brand-panel rounded-2xl overflow-hidden relative mb-4 border border-brand-border/40 flex items-center justify-center">
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-25 text-brand-muted">
                        <Package size={32} className="stroke-[1px]" />
                        <span className="text-[7px] uppercase tracking-widest font-black mt-1">NO IMAGE</span>
                      </div>
                      
                      {hasImage && (
                        <img
                          src={apiUrl(item.Product.product_image || item.Product.image_url)}
                          alt={item.Product.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 z-10"
                          loading="lazy"
                        />
                      )}

                      {/* Stock Label Overlay */}
                      <div className="absolute top-2.5 right-2.5 z-20">
                        {isOutOfStock ? (
                          <span className="bg-brand-surface text-main text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-brand-border">
                            Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                            Low Stock
                          </span>
                        ) : (
                          <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[8px] border border-green-500/20 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                            {item.quantity} In Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta Detail Info */}
                    <h3 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight line-clamp-1 capitalize">
                      {item.Product.name}
                    </h3>
                    <p className="text-[9px] font-mono text-brand-muted tracking-wider mb-2">
                      {item.Product.sku}
                    </p>
                    <p className="text-[11px] text-brand-muted leading-normal line-clamp-2 mb-3">
                      {descText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-brand-border gap-2">
                    <span className="text-base font-rajdhani font-black text-main tracking-wide">
                      ₱{formattedPrice}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {/* Dynamic Customizer link switcher */}
                      {!isOutOfStock && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent quick add click trigger
                            handleProductCustomize(item);
                          }}
                          className="px-2.5 py-1.5 bg-brand-panel border border-brand-border rounded-lg text-[9px] font-black uppercase tracking-wider text-brand-muted hover:text-main hover:bg-brand-hover transition-colors"
                        >
                          {t[language].customize}
                        </button>
                      )}
                      
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(item);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isOutOfStock 
                            ? "bg-brand-panel text-brand-muted/40 border border-brand-border cursor-not-allowed" 
                            : `${activeTheme.primaryBg} ${activeTheme.primaryText} hover:scale-105 active:scale-95 shadow-sm dark:shadow-none`
                        }`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────
          FLOATING REVIEW BAR (McDonald's Style bottom pill)
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cart.length > 0 && !isReviewOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 80, opacity: 0, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-40 bg-brand-surface text-main border border-brand-border rounded-full pl-6 pr-4 py-3 shadow-2xl flex items-center gap-6 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${activeTheme.primaryBg} flex items-center justify-center text-neutral-900 font-bold shadow-sm`}>
                <ShoppingCart size={15} className={activeTheme.primaryText} />
              </div>
              <div>
                <p className="text-[10px] text-brand-muted font-black uppercase tracking-widest leading-none">
                  {cart.reduce((s, i) => s + i.quantity, 0)} {t[language].itemCount}
                </p>
                <p className="text-sm font-rajdhani font-black text-main mt-1 leading-none">
                  ₱{subtotal.toLocaleString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setCheckoutStep("review");
                setIsReviewOpen(true);
              }}
              className={`h-11 px-6 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-2 ${activeTheme.primaryBg} ${activeTheme.primaryText} transition-all active:scale-95 shadow-sm`}
            >
              <span>{t[language].reviewOrder}</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          PRODUCT CUSTOMIZER MODAL (Bottom Sheet)
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProductDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-brand-surface rounded-3xl w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] flex flex-col md:flex-row overflow-hidden border border-brand-border shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-brand-panel flex items-center justify-center hover:bg-brand-hover transition-all text-main border border-brand-border"
              >
                <X size={16} />
              </button>

              {/* Left Column: Image Area */}
              <div className="md:w-[40%] bg-brand-panel p-6 flex flex-col items-center justify-center border-r border-brand-border">
                <div className="w-full max-w-[240px] aspect-square rounded-2xl bg-brand-surface border border-brand-border relative overflow-hidden flex items-center justify-center shadow-sm dark:shadow-none">
                  {selectedProductDetail.Product?.product_image || selectedProductDetail.Product?.image_url ? (
                    <img
                      src={apiUrl(selectedProductDetail.Product?.product_image || selectedProductDetail.Product?.image_url)}
                      alt={selectedProductDetail.Product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={64} className="text-brand-muted stroke-[1px]" />
                  )}
                </div>
                <h4 className="text-xs font-mono text-brand-muted mt-4 tracking-widest">{selectedProductDetail.Product.sku}</h4>
              </div>

              {/* Right Column: Customizer Form */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-brand-surface">
                {/* Header detail */}
                <div className="p-6 pb-4 border-b border-brand-border">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${activeTheme.text}`}>
                    {selectedProductDetail.Product.Category?.name || "Kiosk catalog"}
                  </span>
                  <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wide mt-1">
                    {selectedProductDetail.Product.name}
                  </h2>
                  <p className="text-xs text-brand-muted mt-1 leading-normal">
                    {selectedProductDetail.Product.description || "Pick custom upgrades and components setup details below."}
                  </p>
                </div>

                {/* Main Scroll Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Variant Option */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-3">
                      {t[language].variants}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getProductOptions(selectedProductDetail.Product?.Category?.name).variants.map((v) => {
                        const isSel = selectedVariant?.name === v.name;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                              isSel 
                                ? `border-2 border-brand-neonblue bg-brand-neonblue/10 text-main`
                                : "border-brand-border bg-brand-surface hover:bg-brand-hover text-main"
                            }`}
                          >
                            <span>{v.name}</span>
                            {isSel && <Check size={14} className="text-brand-neonblue" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add-on Upgrades */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-3">
                      {t[language].addons}
                    </h4>
                    <div className="space-y-2.5">
                      {getProductOptions(selectedProductDetail.Product?.Category?.name).addons.map((addon) => {
                        const isAdded = selectedAddons.some(a => a.name === addon.name);
                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => handleToggleAddon(addon)}
                            className={`w-full p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                              isAdded 
                                ? `border-2 border-brand-neonblue bg-brand-neonblue/10 text-main`
                                : "border-brand-border bg-brand-surface hover:bg-brand-hover text-main"
                            }`}
                          >
                            <span>{addon.name}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isAdded 
                                ? `${activeTheme.primaryBg} ${activeTheme.primaryText} border-transparent shadow-sm` 
                                : "border-brand-border bg-brand-surface"
                            }`}>
                              {isAdded && <Check size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Notes */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">
                      {t[language].notes}
                    </h4>
                    <textarea
                      value={customNotes}
                      onChange={e => setCustomNotes(e.target.value)}
                      placeholder={t[language].notesPlaceholder}
                      rows={2}
                      className="w-full p-3.5 bg-brand-panel border border-brand-border rounded-2xl text-xs font-semibold focus:outline-none focus:border-brand-neonblue/40 text-main resize-none placeholder:opacity-40"
                    />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-brand-border bg-brand-panel flex items-center justify-between gap-4">
                  {/* Quantity Counter */}
                  <div className="flex items-center gap-4 bg-brand-surface border border-brand-border rounded-2xl p-1.5 shadow-sm dark:shadow-none">
                    <button
                      type="button"
                      onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                      className="w-9 h-9 rounded-xl hover:bg-brand-hover flex items-center justify-center text-main font-bold active:scale-90 transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-black w-8 text-center text-main">
                      {customQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (customQuantity < selectedProductDetail.quantity) {
                          setCustomQuantity(customQuantity + 1);
                        } else {
                          showError(t[language].insufficientStock);
                        }
                      }}
                      className="w-9 h-9 rounded-xl hover:bg-brand-hover flex items-center justify-center text-main font-bold active:scale-90 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Add order button */}
                  <button
                    onClick={handleAddToOrder}
                    className={`flex-1 h-13 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${activeTheme.primaryBg} ${activeTheme.primaryText} transition-all active:scale-98 shadow-md`}
                  >
                    <span>{t[language].addToOrder}</span>
                    <span className="opacity-45">•</span>
                    <span>₱{(parseFloat(selectedProductDetail.Product.price) * customQuantity).toLocaleString()}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION SPLASH ANIMATION */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-surface/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`w-28 h-28 rounded-full border-4 ${activeTheme.border} flex items-center justify-center mb-6 text-green-550 shadow-lg bg-green-500/10`}
            >
              <CheckCircle2 size={64} className="text-green-500" />
            </motion.div>
            <h3 className="text-2xl font-rajdhani font-black tracking-widest uppercase text-main">
              {t[language].confirmAdded}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          FULL-SCREEN CART REVIEW OVERLAY & CHECKOUT SCREEN
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isReviewOpen && (
          <div className="fixed inset-0 z-50 bg-brand-surface flex flex-col text-main">
            {/* Header review */}
            <header className="h-20 border-b border-brand-border px-6 flex items-center justify-between shrink-0 bg-brand-surface">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    if (checkoutStep === "payment") {
                      setCheckoutStep("review");
                    } else {
                      setIsReviewOpen(false);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-brand-panel hover:bg-brand-hover flex items-center justify-center text-main transition-colors border border-brand-border"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-lg font-rajdhani font-black tracking-wider uppercase">
                  {checkoutStep === "review" ? t[language].reviewOrder : t[language].paymentTitle}
                </h2>
              </div>
              
              <button
                onClick={() => setIsReviewOpen(false)}
                className="w-10 h-10 rounded-full bg-brand-panel hover:bg-brand-hover flex items-center justify-center text-brand-muted border border-brand-border"
              >
                <X size={18} />
              </button>
            </header>

            {/* Split Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-brand-bgbase">
              
              {/* LEFT COLUMN: Item Lists OR Payment Method Forms */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar border-r border-brand-border bg-brand-bgbase/40">
                {checkoutStep === "review" ? (
                  /* REVIEW STEP ITEMS LIST */
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const invItem = inventory.find(i => i.product_id === item.id);
                          if (invItem) {
                            handleProductCustomize(invItem);
                          }
                        }}
                        className="bg-brand-surface rounded-3xl p-5 border border-brand-border shadow-sm dark:shadow-none flex items-center justify-between gap-6 cursor-pointer hover:border-brand-neonblue/20 dark:hover:border-brand-neonblue/40 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Image Box */}
                          <div className="w-16 h-16 rounded-xl bg-brand-panel border border-brand-border flex items-center justify-center shrink-0 overflow-hidden">
                            <Package size={24} className="text-brand-muted stroke-[1.5px]" />
                          </div>
                          
                          {/* Title / Meta */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight truncate">
                              {item.name}
                            </h4>
                            <p className="text-[9px] font-mono text-brand-muted mt-0.5 tracking-wider">{item.sku}</p>
                            
                            {/* Variant / Addon descriptors */}
                            <p className="text-[10px] font-bold text-main mt-2 bg-brand-panel border border-brand-border inline-block px-2.5 py-0.5 rounded-lg leading-relaxed">
                              {item.selectionSummary}
                            </p>
                          </div>
                        </div>

                        {/* Quantity Counter & Price Column */}
                        <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-3 bg-brand-panel border border-brand-border rounded-xl p-1 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 bg-brand-surface rounded-lg hover:bg-brand-hover flex items-center justify-center text-main transition-colors border border-brand-border"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-black min-w-[20px] text-center text-main">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 bg-brand-surface rounded-lg hover:bg-brand-hover flex items-center justify-center text-main transition-colors border border-brand-border"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <span className="text-sm font-rajdhani font-black text-main">
                              ₱{(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-brand-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* PAYMENT STEP DETAILS */
                  <div className="max-w-xl mx-auto space-y-6">
                    {/* Method Selector Boxes */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: t[language].payCounter, icon: Banknote, val: "Cash", activeClass: `${activeTheme.primaryBg} ${activeTheme.primaryText} border-transparent` },
                        { label: t[language].payGcash, icon: Zap, val: "GCash", activeClass: "bg-blue-650 text-white border-transparent" },
                        { label: t[language].payBank, icon: Banknote, val: "Bank", activeClass: "bg-green-650 text-white border-transparent" }
                      ].map((pm) => {
                        const isSel = paymentMethod === pm.val;
                        return (
                          <button
                            key={pm.val}
                            type="button"
                            onClick={() => setPaymentMethod(pm.val)}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                              isSel 
                                ? pm.activeClass + " shadow-md font-bold" 
                                : "bg-brand-surface border-brand-border text-brand-muted hover:text-main hover:bg-brand-hover"
                            }`}
                          >
                            <pm.icon size={20} />
                            <span className="text-[10px] font-black uppercase tracking-wider leading-tight">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Conditional GCash / Bank Transfers QR */}
                    <AnimatePresence mode="wait">
                      {(paymentMethod === "GCash" || paymentMethod === "Bank") && (
                        <motion.div
                          key="transfer-fields"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-brand-surface rounded-3xl p-6 border border-brand-border shadow-sm space-y-5"
                        >
                          <div className="flex flex-col items-center text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-4">
                              Scan QR Code to Pay ₱{grandTotal.toLocaleString()}
                            </p>
                            
                            {/* Mock QR Canvas */}
                            <div className="w-40 h-40 bg-brand-panel border-2 border-brand-border rounded-2xl flex items-center justify-center p-3 relative shadow-inner">
                              {/* QR visual simulator */}
                              <div className="w-full h-full border border-brand-border/60 border-dashed rounded-lg flex flex-col items-center justify-center">
                                <Zap size={40} className={paymentMethod === "GCash" ? "text-blue-500 animate-pulse" : "text-green-500 animate-pulse"} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted mt-2">
                                  {paymentMethod === "GCash" ? "GCASH PAY" : "BANK PAY"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2 font-bold">
                              {t[language].receiptSlip}
                            </label>
                            {proofFile ? (
                              <div className="flex items-center justify-between p-3.5 bg-brand-panel border border-brand-border rounded-xl">
                                <span className="text-xs text-main font-bold truncate max-w-[240px]">
                                  📎 {proofFile.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setProofFile(null)}
                                  className="text-brand-muted hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => setProofFile(e.target.files[0] || null)}
                                className="w-full bg-brand-panel border border-brand-border rounded-xl p-3 text-xs text-brand-muted file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-brand-surface file:text-main hover:file:bg-brand-hover"
                              />
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Cash Counter details */}
                      {paymentMethod === "Cash" && (
                        <motion.div
                          key="cash-fields"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-brand-surface rounded-3xl p-6 border border-brand-border shadow-sm space-y-4"
                        >
                          <div className="flex items-center gap-3 text-brand-muted bg-brand-panel p-4 rounded-2xl border border-brand-border/60">
                            <Info size={16} className="text-brand-neonblue shrink-0" />
                            <p className="text-[11px] leading-normal font-semibold">
                              Please submit and obtain your printed receipt copy, then hand it with your payment cash to the counter teller.
                            </p>
                          </div>

                          {/* Cash Drawer cashier inputs */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2 font-bold">
                              {t[language].cashReceived}
                            </label>
                            <input
                              type="number"
                              min={grandTotal}
                              step="any"
                              value={cashPaid}
                              onChange={e => setCashPaid(e.target.value)}
                              placeholder={`Min: ₱${grandTotal.toLocaleString()}`}
                              className="w-full bg-brand-panel border border-brand-border rounded-xl p-3.5 text-sm font-bold text-main outline-none focus:border-brand-neonblue/40"
                            />
                            
                            {cashPaid && parseFloat(cashPaid) >= grandTotal && (
                              <div className="flex justify-between items-center mt-3 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">{t[language].change}</span>
                                <span className="text-base font-black text-green-500">
                                  ₱{(parseFloat(cashPaid) - grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            {cashPaid && parseFloat(cashPaid) < grandTotal && (
                              <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">{t[language].insufficientCash}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Totals Summary Panel & Checkout Trigger */}
              <div className="lg:w-[380px] border-t lg:border-t-0 lg:border-l border-brand-border p-6 md:p-8 flex flex-col justify-between bg-brand-surface shrink-0">
                {/* Section Top details */}
                <div className="space-y-6">
                  {/* Summary header */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">
                      Order Summary
                    </h3>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-rajdhani font-black text-main">
                        {cart.reduce((s, i) => s + i.quantity, 0)} {t[language].itemCount}
                      </span>
                      <span className="text-xs font-bold text-brand-muted">PC Alley POS</span>
                    </div>
                  </div>

                  {/* Customer search selection details */}
                  <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-muted leading-none">
                      {t[language].loyaltyTitle}
                    </h4>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <div className="relative flex-1">
                        <div className="flex items-center gap-2 bg-brand-surface border border-brand-border rounded-xl px-3 py-2">
                          {selectedCustomer ? (
                            <UserCheck size={13} className="text-green-650 shrink-0" />
                          ) : (
                            <User size={13} className="text-brand-muted/50 shrink-0" />
                          )}
                          <input
                            type="text"
                            value={customerQuery}
                            onChange={e => handleCustomerSearch(e.target.value)}
                            placeholder={t[language].loyaltyPlaceholder}
                            className="flex-1 bg-transparent text-[11px] font-bold text-main placeholder:text-brand-muted/40 outline-none"
                          />
                          {customerSearching && <Loader2 size={11} className="animate-spin text-brand-muted shrink-0" />}
                          {selectedCustomer && (
                            <button onClick={clearCustomer} className="text-brand-muted hover:text-red-500 transition-colors">
                              <X size={11} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Customer results */}
                        <AnimatePresence>
                          {customerResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden z-20 shadow-xl"
                            >
                              {customerResults.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => selectCustomer(c)}
                                  className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-brand-hover transition-colors text-left"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center font-black text-[9px] text-brand-muted shrink-0">
                                    {c.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-main">{c.name}</p>
                                    <p className="text-[8px] text-brand-muted font-bold">{c.phone || c.email || "—"}</p>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Add new customer button */}
                      <button
                        type="button"
                        onClick={() => setIsCustomerModalOpen(true)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 ${activeTheme.primaryBg} ${activeTheme.primaryText}`}
                        title={t[language].newCustomer}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {selectedCustomer && (
                      <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                        <UserCheck size={12} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-green-600 dark:text-green-400 truncate leading-none">{selectedCustomer.name}</p>
                          <p className="text-[8px] text-brand-muted font-black mt-1 uppercase tracking-wider">
                            Orders: {selectedCustomer.totalOrders} • ₱{parseFloat(selectedCustomer.totalSpent || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotals & primary Checkout CTA */}
                <div className="space-y-4 pt-4 border-t border-brand-border">
                  <div className="space-y-2 text-xs text-brand-muted font-semibold">
                    <div className="flex justify-between">
                      <span>{t[language].subtotal}</span>
                      <span className="text-main font-bold">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* ── DISCOUNT DROPDOWN (from Discounts page) ── */}
                    {(() => {
                      const now = new Date();
                      const eligibleDiscounts = availableDiscounts.filter(d =>
                        d.active &&
                        new Date(d.expiry_date) > now &&
                        (d.max_uses === null || d.uses < d.max_uses)
                      );
                      return (
                        <div className="rounded-xl border border-dashed border-brand-border bg-brand-panel p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-muted">
                              <Tag size={11} className="text-brand-neonblue" />
                              <span>{t[language].discount}</span>
                            </div>
                            {selectedDiscount && (
                              <button
                                type="button"
                                onClick={() => setSelectedDiscount(null)}
                                className="text-[8px] font-black uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {eligibleDiscounts.length === 0 ? (
                            <p className="text-[9px] text-brand-muted font-bold text-center py-1">
                              No active discounts available
                            </p>
                          ) : (
                            <select
                              value={selectedDiscount?.id ?? ""}
                              onChange={e => {
                                const chosen = eligibleDiscounts.find(d => String(d.id) === e.target.value);
                                if (!chosen) { setSelectedDiscount(null); return; }
                                // Validate min purchase
                                if (chosen.min_purchase > 0 && subtotal < chosen.min_purchase) {
                                  showError(`Minimum purchase of ₱${chosen.min_purchase.toLocaleString()} required for "${chosen.name}"`);
                                  return;
                                }
                                setSelectedDiscount(chosen);
                              }}
                              className="w-full bg-brand-surface border border-brand-border rounded-lg py-1.5 px-3 text-xs font-bold text-main outline-none focus:border-brand-neonblue/40 appearance-none"
                            >
                              <option value="">— No Discount —</option>
                              {eligibleDiscounts.map(d => (
                                <option key={d.id} value={d.id}>
                                  [{d.code}] {d.name} —{" "}
                                  {d.type === "Percentage (%)" ? `${d.value}% OFF` : `₱${Number(d.value).toLocaleString()} OFF`}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Selected discount details badge */}
                          {selectedDiscount && (
                            <div className="flex items-center justify-between px-2 py-1.5 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-lg">
                              <div>
                                <p className="text-[9px] font-black text-brand-neonblue uppercase tracking-wider">{selectedDiscount.code}</p>
                                <p className="text-[8px] text-brand-muted font-bold mt-0.5">{selectedDiscount.name}</p>
                              </div>
                              <span className="text-[10px] font-black text-red-500">
                                −₱{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}


                    <div className="flex justify-between">
                      <span>{t[language].tax}</span>
                      <span className="text-main font-bold">₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Total</span>
                    <span className="text-2xl font-rajdhani font-black text-main tracking-wide">
                      ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    {checkoutStep === "review" ? (
                      /* Proceed to Payment */
                      <button
                        onClick={() => setCheckoutStep("payment")}
                        className={`w-full h-12 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${activeTheme.primaryBg} ${activeTheme.primaryText} transition-all active:scale-98 shadow-md`}
                      >
                        <span>{t[language].checkout}</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      /* Final order submit */
                      <>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={processing}
                          className="w-full h-11 py-3 bg-brand-surface border border-brand-border text-amber-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-brand-hover transition-all flex items-center justify-center gap-2"
                        >
                          {t[language].saveDraft}
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={processing || (paymentMethod === "Cash" && (!cashPaid || parseFloat(cashPaid) < grandTotal))}
                          className={`w-full h-13 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 text-white bg-green-600 hover:bg-green-700 transition-all active:scale-98 shadow-md disabled:opacity-50 disabled:grayscale border-transparent`}
                        >
                          {processing ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <>
                              <span>{t[language].completeSale}</span>
                              <Check size={15} />
                            </>
                          )}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        if (checkoutStep === "payment") {
                          setCheckoutStep("review");
                        } else {
                          setIsReviewOpen(false);
                        }
                      }}
                      className="w-full h-11 text-brand-muted hover:text-main text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      {t[language].backToMenu}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          SETTINGS MODAL (Exit Kiosk, Select Theme & Branch)
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface text-main border border-brand-border rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-6 relative animate-fade-in"
            >
              <button
                onClick={() => setSettingsOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-brand-panel flex items-center justify-center text-main hover:bg-brand-hover transition-colors border border-brand-border"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-lg font-rajdhani font-black uppercase tracking-wide">
                  {t[language].settingsTitle}
                </h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted mt-1">Cashier &amp; Branch setup</p>
              </div>

              <div className="space-y-4">
                {/* Branch selector - super admin only */}
                {user?.role === "super_admin" && branches.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">
                      {t[language].activeBranch}
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={handleBranchChange}
                      className="w-full bg-brand-panel border border-brand-border rounded-2xl py-3 px-4 text-xs font-bold text-main outline-none focus:border-brand-neonblue/40"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          🏪 {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Theme Accent Color */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2 font-bold font-sans">
                    {t[language].accentColor}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "yellow", label: t[language].themeYellow, dotClass: "bg-amber-400" },
                      { id: "red", label: t[language].themeRed, dotClass: "bg-red-650" },
                      { id: "blue", label: t[language].themeBlue, dotClass: "bg-blue-650" },
                      { id: "green", label: t[language].themeGreen, dotClass: "bg-emerald-600" }
                    ].map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleAccentChange(theme.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold text-left transition-all ${
                          accentColor === theme.id 
                            ? "border-neutral-900 dark:border-white bg-brand-panel border-2 text-main" 
                            : "border-brand-border bg-brand-surface hover:bg-brand-hover text-brand-muted"
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 ${theme.dotClass}`} />
                        <span>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-border flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    window.location.href = "/dashboard";
                  }}
                  className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 animate-pulse"
                >
                  <ArrowLeft size={12} />
                  {t[language].exitBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all text-center"
                >
                  Apply &amp; Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS RECEIPT MODAL */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={handleReceiptClose}
            receipt={displayReceipt}
          />
        )}
      </AnimatePresence>

      {/* ADD CUSTOMER MODAL */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCancelAddCustomer}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-8 shadow-2xl text-main font-sans"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-brand-muted mb-1 font-bold">New Record</p>
                  <h2 className="text-lg font-rajdhani font-black uppercase text-main">Add Customer</h2>
                </div>
                <button
                  onClick={handleCancelAddCustomer}
                  className="p-2 hover:bg-brand-panel rounded-full text-brand-muted hover:text-main transition-colors border border-brand-border"
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
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2 font-bold font-sans">
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
                      className="w-full bg-brand-panel border border-brand-border rounded-xl py-3 px-4 text-xs font-bold text-main outline-none focus:border-brand-neonblue/40 transition-colors placeholder:opacity-50"
                    />
                  </div>
                ))}

                {/* Branch selector — super admin only */}
                {user?.role === "super_admin" && branches.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2 font-bold font-sans">Branch</label>
                    <select
                      value={customerFormData.branchId || ""}
                      onChange={e => setCustomerFormData(prev => ({ ...prev, branchId: e.target.value }))}
                      className="w-full bg-brand-panel border border-brand-border rounded-xl py-3 px-4 text-xs font-bold text-main outline-none focus:border-brand-neonblue/40"
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
                    className="flex-1 h-11 rounded-xl border border-brand-border text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-main hover:bg-brand-hover transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customerSubmitting}
                    className={`flex-1 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTheme.primaryBg} ${activeTheme.primaryText} disabled:opacity-50 border-transparent`}
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

      {/* SUCCESS RECEIPT MODAL */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={handleReceiptClose}
            receipt={displayReceipt}
          />
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
