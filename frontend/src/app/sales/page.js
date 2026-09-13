"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Tag,
  Wrench,
  Clock,
  Sparkles,
  ClipboardList,
  RefreshCw,
  ArrowLeftRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { resolveProductImageUrl, handleProductImageError } from "@/lib/imageHelper";
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
  const discount = parseFloat(receipt.discountAmount || receipt.discount_amount || 0);
  const grandTotal = Math.max(0, parseFloat(receipt.totalAmount || receipt.total_amount || (subtotal - discount)));
  const vatableSales = grandTotal / 1.12;
  const tax = grandTotal - vatableSales;

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
                <div className="flex justify-between items-center text-xs">
                  <span className="text-brand-muted font-bold uppercase tracking-widest text-[9px]">Customer Name</span>
                  <span className="font-bold text-main">{receipt.customerName || receipt.customer_name || "Walk-in Customer"}</span>
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
  const [activeBrand, setActiveBrand] = useState("All");
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

  // ── TECHNICAL SERVICES STATES ──
  const [posMode, setPosMode] = useState("products"); // "products" | "services" | "bundles"
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState(["All"]);
  const [activeServiceCategory, setActiveServiceCategory] = useState("All");
  const [servicesLoading, setServicesLoading] = useState(false);

  // ── BUNDLES STATES ──
  const [bundles, setBundles] = useState([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [selectedBundleForCustomization, setSelectedBundleForCustomization] = useState(null);
  const [bundleCustomItems, setBundleCustomItems] = useState([]);
  const [bundleProductSearch, setBundleProductSearch] = useState("");
  const [bundleProductPickerOpen, setBundleProductPickerOpen] = useState(false);
  const [replacingBundleItemId, setReplacingBundleItemId] = useState(null);

  // Variable / Custom Service Price Input Modal
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);
  const [variablePriceInput, setVariablePriceInput] = useState("");
  const [priceReasonInput, setPriceReasonInput] = useState("");
  const [deviceTypeInput, setDeviceTypeInput] = useState("Desktop PC");
  const [deviceSpecsInput, setDeviceSpecsInput] = useState("");
  const [reportedIssueInput, setReportedIssueInput] = useState("");

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

  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Restore POS cart draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("pc_alley_pos_cart_draft");
      const legacyCart = localStorage.getItem("pc_alley_pos_cart");
      const legacyCustomer = localStorage.getItem("pc_alley_pos_customer");

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed) {
          if (Array.isArray(parsed.cart) && parsed.cart.length > 0) {
            setCart(parsed.cart);
          }
          if (parsed.selectedCustomer) setSelectedCustomer(parsed.selectedCustomer);
          if (parsed.customerQuery) setCustomerQuery(parsed.customerQuery);
          if (parsed.customNotes) setCustomNotes(parsed.customNotes);
          if (parsed.selectedDiscount) setSelectedDiscount(parsed.selectedDiscount);
          if (parsed.selectedBranchId) setSelectedBranchId(parsed.selectedBranchId);
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (parsed.cashPaid) setCashPaid(parsed.cashPaid);
        }
      } else if (legacyCart) {
        const parsed = JSON.parse(legacyCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
        if (legacyCustomer) {
          setCustomerQuery(legacyCustomer);
          if (legacyCustomer !== "Walk-in Customer" && legacyCustomer !== "") {
            setSelectedCustomer({ name: legacyCustomer });
          }
        }
      }
    } catch (err) {
      console.error("Failed to restore cart draft:", err);
    } finally {
      setIsDraftRestored(true);
    }
  }, []);

  // Continuously persist in-progress sale draft to localStorage
  useEffect(() => {
    if (!isDraftRestored) return;
    try {
      if (cart.length > 0) {
        const draft = {
          cart,
          selectedCustomer,
          customerQuery,
          customNotes,
          selectedDiscount,
          selectedBranchId,
          paymentMethod,
          cashPaid,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem("pc_alley_pos_cart_draft", JSON.stringify(draft));
      } else {
        localStorage.removeItem("pc_alley_pos_cart_draft");
        localStorage.removeItem("pc_alley_pos_cart");
        localStorage.removeItem("pc_alley_pos_customer");
      }
    } catch (err) {
      console.error("Failed to persist cart draft:", err);
    }
  }, [cart, selectedCustomer, customerQuery, customNotes, selectedDiscount, selectedBranchId, paymentMethod, cashPaid, isDraftRestored]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchInventory(selectedBranchId);
      fetchBundles(selectedBranchId);
    } else if (user && user.role !== "super_admin") {
      fetchInventory();
      fetchBundles();
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

  const handleBranchChange = async (e) => {
    const newBranchId = e.target.value;
    if (cart.length > 0) {
      const confirmed = await showConfirm(
        "Change Branch",
        "Changing branches will clear your current cart. Proceed?",
        { warning: true, confirmLabel: "Clear & Switch" }
      );
      if (confirmed) {
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
    let url = "/api/inventory?limit=10000";
    if (targetBranch) {
      url += `&branch_id=${targetBranch}`;
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

  const fetchServices = async () => {
    setServicesLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/services?status=active"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (e) {
      console.error("Failed to load services:", e);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchServiceCategories = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/services/categories"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const cats = await res.json();
        setServiceCategories(["All", ...cats]);
      }
    } catch (e) {
      console.error("Failed to load service categories:", e);
    }
  };

  // ── BUNDLES FETCH & CART HANDLERS ──
  const fetchBundles = async (branchId) => {
    setBundlesLoading(true);
    const token = localStorage.getItem("token");
    const targetBranch = branchId || selectedBranchId || user?.branch_id;
    let url = "/api/bundles?status=active";
    if (targetBranch) {
      url += `&branch_id=${targetBranch}`;
    }
    try {
      const res = await fetch(apiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBundles(data);
      }
    } catch (e) {
      console.error("Failed to load bundles:", e);
    } finally {
      setBundlesLoading(false);
    }
  };

  const handleOpenBundleCustomizer = (bundle) => {
    setSelectedBundleForCustomization(bundle);
    setBundleCustomItems(
      (bundle.items || []).map(item => ({
        id: item.Product?.id || item.product_id,
        name: item.Product?.name || `Product #${item.product_id}`,
        sku: item.Product?.sku || "",
        price: parseFloat(item.Product?.price || 0),
        quantity: item.quantity || 1
      }))
    );
    setBundleProductSearch("");
    setBundleProductPickerOpen(false);
    setReplacingBundleItemId(null);
  };

  const handleUpdateBundleItemQty = (productId, delta) => {
    setBundleCustomItems(prev =>
      prev.map(i => {
        if (i.id === productId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean)
    );
  };

  const handleRemoveBundleItem = (productId) => {
    setBundleCustomItems(prev => prev.filter(i => i.id !== productId));
    if (replacingBundleItemId === productId) {
      setReplacingBundleItemId(null);
    }
  };

  const handleStartReplaceBundleItem = (productId) => {
    setReplacingBundleItemId(productId);
    setBundleProductPickerOpen(true);
  };

  const handleReplaceBundleItem = (targetProductId, invItem) => {
    const prod = invItem.Product || invItem;
    if (!prod || !prod.id) return;

    setBundleCustomItems(prev => {
      const targetIndex = prev.findIndex(i => i.id === targetProductId);
      if (targetIndex === -1) return prev;
      const prevQty = prev[targetIndex].quantity || 1;

      // Check if product already exists in bundle
      const alreadyExistsIndex = prev.findIndex((i, idx) => idx !== targetIndex && i.id === prod.id);
      if (alreadyExistsIndex > -1) {
        // Merge quantity
        return prev.map((item, idx) => {
          if (idx === alreadyExistsIndex) {
            return { ...item, quantity: item.quantity + prevQty };
          }
          return idx === targetIndex ? null : item;
        }).filter(Boolean);
      }

      // Drop-in replacement
      const updated = [...prev];
      updated[targetIndex] = {
        id: prod.id,
        name: prod.name,
        sku: prod.sku || "",
        price: parseFloat(prod.price || 0),
        quantity: prevQty
      };
      return updated;
    });

    setReplacingBundleItemId(null);
    setToastMessage(`Swapped for: ${prod.name}`);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(""), 2000);
  };

  const handleAddProductToBundleCustomization = (invItem) => {
    if (replacingBundleItemId) {
      handleReplaceBundleItem(replacingBundleItemId, invItem);
      return;
    }
    const prod = invItem.Product || invItem;
    if (!prod || !prod.id) return;
    const existing = bundleCustomItems.find(i => i.id === prod.id);
    if (existing) {
      setBundleCustomItems(prev =>
        prev.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } else {
      setBundleCustomItems(prev => [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          sku: prod.sku || "",
          price: parseFloat(prod.price || 0),
          quantity: 1
        }
      ]);
    }
  };

  // Determine if the bundle has been customized compared to the original definition
  const isBundleCustomized = useMemo(() => {
    if (!selectedBundleForCustomization) return false;
    const origItems = selectedBundleForCustomization.items || [];
    if (origItems.length !== bundleCustomItems.length) return true;

    for (const ci of bundleCustomItems) {
      const match = origItems.find(oi => (oi.Product?.id || oi.product_id) === ci.id);
      if (!match) return true;
      if ((match.quantity || 1) !== ci.quantity) return true;
    }
    return false;
  }, [selectedBundleForCustomization, bundleCustomItems]);

  // Dynamic pricing recalculation preserving existing promotional discount rules
  const bundleCalculatedPricing = useMemo(() => {
    if (!selectedBundleForCustomization) {
      return { basePrice: 0, originalRetailSum: 0, currentRetailSum: 0, finalPrice: 0, savings: 0 };
    }
    const origItems = selectedBundleForCustomization.items || [];
    const originalRetailSum = origItems.reduce((sum, i) => {
      return sum + (parseFloat(i.Product?.price || 0) * (i.quantity || 1));
    }, 0);
    const baseBundlePrice = parseFloat(selectedBundleForCustomization.price || 0);
    const currentRetailSum = bundleCustomItems.reduce((sum, i) => {
      return sum + (parseFloat(i.price || 0) * (i.quantity || 1));
    }, 0);

    const promotionalSavings = (originalRetailSum > baseBundlePrice && baseBundlePrice > 0)
      ? (originalRetailSum - baseBundlePrice)
      : 0;

    let finalPrice = baseBundlePrice;
    if (isBundleCustomized) {
      if (promotionalSavings > 0) {
        finalPrice = Math.max(0, currentRetailSum - promotionalSavings);
      } else {
        finalPrice = currentRetailSum;
      }
    } else {
      finalPrice = baseBundlePrice > 0 ? baseBundlePrice : currentRetailSum;
    }

    return {
      basePrice: baseBundlePrice,
      originalRetailSum,
      currentRetailSum,
      finalPrice: Math.round(finalPrice * 100) / 100,
      savings: promotionalSavings
    };
  }, [selectedBundleForCustomization, bundleCustomItems, isBundleCustomized]);

  const handleConfirmAddBundleToOrder = () => {
    if (!selectedBundleForCustomization || bundleCustomItems.length === 0) {
      showError("Bundle must contain at least one product.");
      return;
    }

    const { finalPrice, currentRetailSum } = bundleCalculatedPricing;
    const bundleDisplayName = isBundleCustomized
      ? `${selectedBundleForCustomization.name} — Customized`
      : selectedBundleForCustomization.name;

    const updatedCart = [...cart];
    let runningApportionedTotal = 0;

    bundleCustomItems.forEach((bundleItem, idx) => {
      const invItem = inventory.find(i => i.product_id === bundleItem.id || i.Product?.id === bundleItem.id);
      const stock = invItem ? (invItem.quantity ?? invItem.stock ?? 9999) : 9999;

      let effectiveUnitPrice = bundleItem.price;
      if (currentRetailSum > 0 && finalPrice !== currentRetailSum) {
        if (idx === bundleCustomItems.length - 1) {
          const remaining = Math.max(0, finalPrice - runningApportionedTotal);
          effectiveUnitPrice = Math.round((remaining / bundleItem.quantity) * 100) / 100;
        } else {
          effectiveUnitPrice = Math.round((bundleItem.price * (finalPrice / currentRetailSum)) * 100) / 100;
          runningApportionedTotal += (effectiveUnitPrice * bundleItem.quantity);
        }
      }

      const cartItem = {
        id: bundleItem.id,
        name: bundleItem.name,
        price: effectiveUnitPrice,
        unitPrice: effectiveUnitPrice,
        sku: bundleItem.sku,
        quantity: bundleItem.quantity,
        maxStock: stock,
        isBundleItem: true,
        bundleId: selectedBundleForCustomization.id,
        bundleName: bundleDisplayName,
        isCustomizedBundle: isBundleCustomized,
        item_type: "product",
        isService: false,
        selectedVariant: "Standard",
        selectedAddons: [],
        notes: "",
        selectionSummary: `Bundle: ${bundleDisplayName} (${bundleItem.name})`
      };
      updatedCart.push(cartItem);
    });

    setCart(updatedCart);
    setToastMessage(`${t[language].addedToOrder}: ${bundleDisplayName}`);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(""), 2000);
    setSelectedBundleForCustomization(null);
    setReplacingBundleItemId(null);
  };

  useEffect(() => {
    fetchServices();
    fetchServiceCategories();
    fetchBundles();
  }, []);

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
    const custName = customerFormData.name.trim();
    if (!custName) {
      showError("Name is required");
      return;
    }
    if (/\d/.test(custName)) {
      showError("Customer name cannot contain numbers.");
      return;
    }
    if (!/^[A-Za-z\s.\'-]+$/.test(custName)) {
      showError("Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.");
      return;
    }
    if (custName.length < 2 || custName.length > 100) {
      showError("Customer name must be between 2 and 100 characters.");
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
    const matchBrand = activeBrand === "All" || item.Product?.Brand?.name === activeBrand;
    const matchSearch = !productSearch ||
      item.Product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.Product?.sku?.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchBrand && matchSearch;
  });

  // Derive brand list from current category-filtered inventory
  const brandsInCategory = ["All", ...new Set(
    inventory
      .filter(i => activeCategory === "All" || i.Product?.Category?.name === activeCategory)
      .map(i => i.Product?.Brand?.name)
      .filter(Boolean)
  )];

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

  // ── TECHNICAL SERVICE CART HANDLERS ──
  const handleQuickAddService = (service) => {
    if (service.pricing_type === "variable" || service.pricing_type === "custom") {
      setSelectedServiceDetail(service);
      setVariablePriceInput(String(service.base_price || ""));
      setPriceReasonInput("");
      setDeviceTypeInput("Desktop PC");
      setDeviceSpecsInput("");
      setReportedIssueInput("");
      return;
    }

    const existingIndex = cart.findIndex(c => c.id === service.id && c.isService);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + 1
      };
      setCart(updatedCart);
    } else {
      const cartItem = {
        id: service.id,
        name: service.name,
        price: parseFloat(service.base_price || 0),
        unitPrice: parseFloat(service.base_price || 0),
        quantity: 1,
        maxStock: 9999,
        item_type: "service",
        isService: true,
        selectedVariant: "Standard",
        selectedAddons: [],
        notes: "",
        selectionSummary: `Technical Service (${service.category}) • Labor`
      };
      setCart([...cart, cartItem]);
    }

    setToastMessage(`${t[language].addedToOrder}: ${service.name}`);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(""), 1500);
  };

  const handleConfirmVariableService = () => {
    if (!selectedServiceDetail) return;
    const priceVal = parseFloat(variablePriceInput);
    if (isNaN(priceVal) || priceVal < 0) {
      showError("Please enter a valid service price (≥ 0)");
      return;
    }

    const reason = priceReasonInput.trim() || (selectedServiceDetail.pricing_type === 'custom' ? 'Custom evaluated service quote' : 'Standard variable price adjustment');
    const summary = `Fee: ₱${priceVal.toLocaleString()} | Reason: ${reason}${deviceSpecsInput ? ` | ${deviceTypeInput} (${deviceSpecsInput})` : ''}`;

    const cartItem = {
      id: selectedServiceDetail.id,
      name: selectedServiceDetail.name,
      price: priceVal,
      unitPrice: priceVal,
      quantity: 1,
      maxStock: 9999,
      item_type: "service",
      isService: true,
      priceOverrideReason: reason,
      notes: reportedIssueInput ? `Reported Issue: ${reportedIssueInput}` : "",
      selectionSummary: summary
    };

    setCart([...cart, cartItem]);
    setSelectedServiceDetail(null);
    showSuccess(`Added ${selectedServiceDetail.name} to order`);
  };

  const updateQuantity = (id, delta, isServiceItem) => {
    setCart(cart.map(item => {
      const match = isServiceItem !== undefined ? (item.id === id && !!item.isService === !!isServiceItem) : (item.id === id);
      if (!match) return item;
      const newQty = Math.max(1, item.quantity + delta);
      if (!item.isService && newQty > item.maxStock) {
        showError(t[language].insufficientStock);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (id, isServiceItem) => setCart(cart.filter(item => {
    if (isServiceItem !== undefined) {
      return !(item.id === id && !!item.isService === !!isServiceItem);
    }
    return item.id !== id;
  }));

  const productSubtotal = cart
    .filter(i => !i.isService && i.item_type !== "service")
    .reduce((s, i) => s + i.price * i.quantity, 0);

  const serviceSubtotal = cart
    .filter(i => i.isService || i.item_type === "service")
    .reduce((s, i) => s + i.price * i.quantity, 0);

  // Shelf prices are VAT-inclusive (standard for Philippine retail)
  const subtotal       = productSubtotal + serviceSubtotal;
  const discountAmount = (() => {
    if (!selectedDiscount) return 0;
    const isPercent = selectedDiscount.type === "Percentage (%)";
    if (isPercent) {
      const pct = Math.min(Math.max(Number(selectedDiscount.value) || 0, 0), 100);
      return subtotal * (pct / 100);
    }
    return Math.min(Math.max(Number(selectedDiscount.value) || 0, 0), subtotal);
  })();
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const vatableSales = grandTotal / 1.12;
  const tax        = grandTotal - vatableSales; // Extracted VAT (grandTotal * 12 / 112)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0 || processing) return;

    if (user?.role === "super_admin" && !selectedBranchId) {
      showError("Branch selection is required for checkout. Please select a branch.");
      return;
    }
    
    if (paymentMethod === "Cash" && (!cashPaid || parseFloat(cashPaid) < grandTotal)) {
      showError(t[language].insufficientCash);
      return;
    }
    setProcessing(true);
    const token = localStorage.getItem("token");

    // Construct unified items metadata note to save in DB
    const itemsNotes = cart.map(item => 
      `${item.isService ? '[SERVICE]' : '[PRODUCT]'} ${item.name} (Qty: ${item.quantity}) [${item.selectionSummary}]`
    ).join("\n");
    
    const combinedNotes = customNotes 
      ? `${itemsNotes}\nGeneral Notes: ${customNotes}`
      : itemsNotes;

    try {
      let backendPaymentMethod = paymentMethod.toLowerCase();
      if (backendPaymentMethod === "bank") backendPaymentMethod = "bank_transfer";

      const resolvedBranch = user?.role === "super_admin" 
        ? (selectedBranchId ? Number(selectedBranchId) : undefined)
        : (user?.branch_id ? Number(user?.branch_id) : (selectedBranchId ? Number(selectedBranchId) : undefined));

      const payload = {
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        customer_id:   selectedCustomer?.id   || undefined,
        payment_method: backendPaymentMethod,
        branch_id:     resolvedBranch,
        amount_paid:   paymentMethod === "Cash" ? parseFloat(cashPaid) : grandTotal,
        change_amount: paymentMethod === "Cash" ? Math.max(0, parseFloat(cashPaid) - grandTotal) : 0,
        notes:         combinedNotes,
        items:         cart.map(item => ({
          item_type: item.item_type || (item.isService ? "service" : "product"),
          product_id: (item.item_type === "product" || !item.isService) ? item.id : undefined,
          service_id: (item.item_type === "service" || item.isService) ? item.id : undefined,
          quantity: item.quantity,
          unit_price: item.price,
          bundle_name: item.bundleName || undefined,
          selection_summary: item.selectionSummary || undefined,
          price_override_reason: item.priceOverrideReason || undefined,
          service_job_id: item.serviceJobId || undefined
        }))
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
        if (cartItem.isBundleItem && cartItem.bundleName && !item.productName?.includes(cartItem.bundleName)) {
          details.push(cartItem.bundleName);
        }
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

        {/* Center: Mode switcher (Products vs Services) & Language */}
        <div className="flex items-center gap-3">
          <div className="flex bg-brand-bgbase p-1 rounded-full border border-brand-border shadow-inner">
            <button
              type="button"
              onClick={() => { setPosMode("products"); setActiveCategory("All"); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                posMode === "products"
                  ? `${activeTheme.primaryBg} ${activeTheme.primaryText} shadow-sm`
                  : "text-brand-muted hover:text-main"
              }`}
            >
              <Package size={13} /> Products
            </button>
            <button
              type="button"
              onClick={() => { setPosMode("services"); setActiveServiceCategory("All"); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                posMode === "services"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-brand-muted hover:text-main"
              }`}
            >
              <Wrench size={13} /> Services
            </button>
            <button
              type="button"
              onClick={() => { setPosMode("bundles"); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                posMode === "bundles"
                  ? "bg-brand-neonpurple text-white shadow-sm"
                  : "text-brand-muted hover:text-main"
              }`}
            >
              <Layers size={13} /> Bundles
            </button>
          </div>

          <div className="flex bg-brand-bgbase p-1 rounded-full border border-brand-border">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider transition-all uppercase ${
                language === "en" ? `${activeTheme.primaryBg} ${activeTheme.primaryText} shadow-sm` : "text-brand-muted hover:text-main"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("tg")}
              className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider transition-all uppercase ${
                language === "tg" ? `${activeTheme.primaryBg} ${activeTheme.primaryText} shadow-sm` : "text-brand-muted hover:text-main"
              }`}
            >
              PH
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Branch Selector for Super Admin in Header */}
          {user?.role === "super_admin" && branches.length > 0 && (
            <div className="flex items-center gap-2 bg-brand-bgbase px-3.5 py-1.5 rounded-full border border-brand-border shadow-inner">
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-neonblue">Branch:</span>
              <select
                value={selectedBranchId || ""}
                onChange={handleBranchChange}
                className="bg-transparent text-xs font-bold text-main outline-none cursor-pointer pr-1"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-brand-surface text-main">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                placeholder={posMode === "products" ? t[language].searchPlaceholder : "Search technical services..."}
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
        {posMode === "bundles" ? (
          <div className="flex items-center gap-2">
            <div className="h-11 px-6 rounded-full border text-[11px] font-black uppercase tracking-wider bg-brand-neonpurple/15 text-brand-neonpurple border-brand-neonpurple/30 flex items-center gap-2">
              <Layers size={14} />
              <span>Branch Bundles Catalog ({bundles.length})</span>
            </div>
          </div>
        ) : posMode === "products" ? (
          categories.map(cat => {
            const Icon = getCategoryIcon(cat);
            const isSelected = activeCategory === cat;
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setActiveCategory(cat); setActiveBrand("All"); }}
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
          })
        ) : (
          serviceCategories.map(cat => {
            const isSelected = activeServiceCategory === cat;
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveServiceCategory(cat)}
                className={`h-11 px-6 rounded-full border text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? "bg-purple-600 text-white border-purple-500 shadow-md"
                    : "bg-brand-surface border-brand-border text-brand-muted hover:bg-brand-hover hover:text-main"
                }`}
              >
                <Wrench size={14} />
                <span>{cat === "All" ? "All Technical Services" : cat}</span>
              </motion.button>
            );
          })
        )}
      </nav>

      {/* ─────────────────────────────────────────────────────────────────
          BRAND FILTER CHIPS (SHOWN ONLY FOR PRODUCTS IF BRANDS EXIST)
          ───────────────────────────────────────────────────────────────── */}
      {posMode === "products" && brandsInCategory.length > 1 && (
        <div className="shrink-0 bg-brand-bgbase border-b border-brand-border/50 flex gap-2 overflow-x-auto py-2.5 px-6 no-scrollbar">
          {brandsInCategory.map(brand => {
            const isSelected = activeBrand === brand;
            return (
              <button
                key={brand}
                onClick={() => setActiveBrand(brand)}
                className={`h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border ${
                  isSelected
                    ? `bg-brand-neonblue/15 text-brand-neonblue border-brand-neonblue/30`
                    : "bg-brand-surface border-brand-border/50 text-brand-muted hover:text-main hover:border-brand-neonblue/20"
                }`}
              >
                {brand === "All" ? "All Brands" : brand}
              </button>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          CATALOG GRID AREA (BUNDLES, PRODUCTS, OR TECHNICAL SERVICES)
          ───────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar bg-brand-bgbase">
        {posMode === "bundles" ? (
          /* BUNDLES CATALOG FOR POS */
          bundlesLoading ? (
            <div className="w-full py-40 flex flex-col items-center justify-center opacity-40">
              <Loader2 className="animate-spin mb-4 text-brand-neonpurple" size={40} />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-muted">Loading Branch Bundles…</p>
            </div>
          ) : bundles.filter(b => {
              if (!productSearch) return true;
              const q = productSearch.toLowerCase();
              return b.name.toLowerCase().includes(q) ||
                (b.description && b.description.toLowerCase().includes(q)) ||
                (b.items && b.items.some(i => i.Product?.name?.toLowerCase().includes(q)));
            }).length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center opacity-40 text-center">
              <Layers size={64} className="text-brand-neonpurple mb-4 stroke-[1px]" />
              <h4 className="text-[12px] font-black uppercase tracking-[3px] text-brand-muted">No matching bundles</h4>
              <p className="text-xs text-brand-muted mt-1">No bundle packages currently available for this branch</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
              {bundles
                .filter(b => {
                  if (!productSearch) return true;
                  const q = productSearch.toLowerCase();
                  return b.name.toLowerCase().includes(q) ||
                    (b.description && b.description.toLowerCase().includes(q)) ||
                    (b.items && b.items.some(i => i.Product?.name?.toLowerCase().includes(q)));
                })
                .map((bundle) => {
                  const totalItems = (bundle.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                  const retailSum = (bundle.items || []).reduce((sum, i) => {
                    const p = parseFloat(i.Product?.price || 0);
                    return sum + (p * (i.quantity || 1));
                  }, 0);
                  const bundlePrice = parseFloat(bundle.price || 0);
                  const savings = retailSum > bundlePrice ? retailSum - bundlePrice : 0;

                  return (
                    <motion.div
                      key={bundle.id}
                      onClick={() => handleOpenBundleCustomizer(bundle)}
                      className="bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-neonpurple/40 p-5 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-neonpurple/10 text-brand-neonpurple border border-brand-neonpurple/20 flex items-center gap-1">
                            <ShoppingBag size={11} /> {totalItems} {totalItems === 1 ? "Item" : "Items"}
                          </span>
                          {savings > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Save ₱{savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-panel text-brand-muted border border-brand-border">
                              PACKAGE
                            </span>
                          )}
                        </div>

                        <div className="w-full h-28 bg-brand-neonpurple/5 rounded-2xl border border-brand-neonpurple/10 mb-4 flex flex-col items-center justify-center text-brand-neonpurple group-hover:scale-102 transition-transform">
                          <Layers size={36} className="stroke-[1.5px] mb-1" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-brand-neonpurple/70">
                            Customizable Package
                          </span>
                        </div>

                        <h3 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight line-clamp-1 group-hover:text-brand-neonpurple transition-colors">
                          {bundle.name}
                        </h3>

                        <p className="text-[11px] text-brand-muted leading-relaxed line-clamp-2 my-2">
                          {bundle.description || "Curated promotional bundle with customizable components for this branch."}
                        </p>

                        <div className="bg-brand-bgbase rounded-xl p-2.5 border border-brand-border/60 my-2 space-y-1">
                          {(bundle.items || []).slice(0, 2).map((it, itIdx) => (
                            <div key={itIdx} className="flex justify-between items-center text-[11px]">
                              <span className="text-main font-bold truncate pr-2">{it.Product?.name || `Product #${it.product_id}`}</span>
                              <span className="font-mono text-brand-neonpurple font-black">x{it.quantity || 1}</span>
                            </div>
                          ))}
                          {(bundle.items || []).length > 2 && (
                            <p className="text-[9px] font-bold text-brand-neonblue pt-0.5">
                              +{(bundle.items || []).length - 2} more items...
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-brand-border/60 pt-3 mt-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-muted block">
                            Package Price
                          </span>
                          <span className="text-base font-rajdhani font-black text-brand-neonpurple">
                            ₱{bundlePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBundleCustomizer(bundle);
                          }}
                          className="px-3.5 py-1.5 bg-brand-neonpurple hover:bg-brand-neonpurple/80 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Customize &amp; Add
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )
        ) : posMode === "services" ? (
          /* TECHNICAL SERVICES CATALOG */
          servicesLoading ? (
            <div className="w-full py-40 flex flex-col items-center justify-center opacity-40">
              <Loader2 className="animate-spin mb-4 text-purple-400" size={40} />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-muted">Loading Technical Services…</p>
            </div>
          ) : services.filter(s => {
              const matchCat = activeServiceCategory === "All" || s.category === activeServiceCategory;
              const matchSearch = !productSearch ||
                s.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                (s.description && s.description.toLowerCase().includes(productSearch.toLowerCase())) ||
                s.category.toLowerCase().includes(productSearch.toLowerCase());
              return matchCat && matchSearch;
            }).length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center opacity-40 text-center">
              <Wrench size={64} className="text-purple-400 mb-4 stroke-[1px]" />
              <h4 className="text-[12px] font-black uppercase tracking-[3px] text-brand-muted">No matching services</h4>
              <p className="text-xs text-brand-muted mt-1">Try selecting another service category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
              {services
                .filter(s => {
                  const matchCat = activeServiceCategory === "All" || s.category === activeServiceCategory;
                  const matchSearch = !productSearch ||
                    s.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    (s.description && s.description.toLowerCase().includes(productSearch.toLowerCase())) ||
                    s.category.toLowerCase().includes(productSearch.toLowerCase());
                  return matchCat && matchSearch;
                })
                .map((service) => {
                  const cartItem = cart.find(c => c.id === service.id && c.isService);
                  const pricingMeta = {
                    fixed: { label: "FIXED FEE", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                    variable: { label: "VARIABLE PRICE", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                    custom: { label: "CUSTOM QUOTE", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
                  }[service.pricing_type] || { label: "LABOR", bg: "bg-brand-panel text-brand-muted border-brand-border" };

                  return (
                    <motion.div
                      key={service.id}
                      onClick={() => handleQuickAddService(service)}
                      className="bg-brand-surface rounded-3xl border border-brand-border hover:border-purple-500/40 p-5 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                    >
                      <div>
                        {cartItem && (
                          <div className="absolute top-3 left-3 z-30 bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                            +{cartItem.quantity} in order
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-panel border border-brand-border text-brand-muted">
                            {service.category}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${pricingMeta.bg}`}>
                            {pricingMeta.label}
                          </span>
                        </div>

                        <div className="w-full h-28 bg-purple-500/5 rounded-2xl border border-purple-500/10 mb-4 flex flex-col items-center justify-center text-purple-400 group-hover:scale-102 transition-transform">
                          <Wrench size={32} className="stroke-[1.5px] mb-1" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-purple-400/70">
                            Zero Inventory • Pure Labor
                          </span>
                        </div>

                        <h3 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight line-clamp-1 group-hover:text-purple-400 transition-colors">
                          {service.name}
                        </h3>

                        <p className="text-[11px] text-brand-muted leading-relaxed line-clamp-2 my-2">
                          {service.description || "Professional technical service performed by PC Alley technicians."}
                        </p>
                      </div>

                      <div className="border-t border-brand-border/60 pt-3 mt-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-muted block">
                            {service.pricing_type === "fixed" ? "Fixed Fee" : "Starting Fee"}
                          </span>
                          <span className="text-base font-rajdhani font-black text-main">
                            ₱{parseFloat(service.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddService(service);
                          }}
                          className="px-3.5 py-1.5 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                          {service.pricing_type === "fixed" ? "Add" : "Price & Add"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )
        ) : (
          /* PHYSICAL PRODUCTS CATALOG */
          loading ? (
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
                const cardImageUrl = resolveProductImageUrl(item.Product, "medium");
                const formattedPrice = parseFloat(item.Product.price).toLocaleString();
                const isLowStock = item.quantity <= 5;
                const isOutOfStock = item.quantity <= 0;
                
                // Find matching cart item to display visual badges
                const cartItem = cart.find(c => c.id === item.product_id && !c.isService);
              
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
                      
                      {cardImageUrl && (
                        <img
                          src={cardImageUrl}
                          alt={item.Product.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 z-10"
                          loading="lazy"
                          onError={handleProductImageError}
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
                    <h3 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight line-clamp-1">
                      {item.Product.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[9px] font-mono text-brand-muted tracking-wider">
                        {item.Product.sku}
                      </p>
                      {item.Product?.Brand?.name && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-brand-neonblue bg-brand-neonblue/10 px-1.5 py-0.5 rounded-full border border-brand-neonblue/15">
                          {item.Product.Brand.name}
                        </span>
                      )}
                    </div>
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
        ))}
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-25 text-brand-muted">
                    <Package size={64} className="stroke-[1px]" />
                    <span className="text-[9px] uppercase tracking-widest font-black mt-2">NO IMAGE</span>
                  </div>
                  {resolveProductImageUrl(selectedProductDetail.Product, "original") && (
                    <img
                      src={resolveProductImageUrl(selectedProductDetail.Product, "original")}
                      alt={selectedProductDetail.Product.name}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      onError={handleProductImageError}
                    />
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

        {/* ─────────────────────────────────────────────────────────────────
            VARIABLE / CUSTOM SERVICE PRICING MODAL
            ───────────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedServiceDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-surface rounded-3xl w-full max-w-lg p-7 border border-brand-border shadow-2xl relative"
              >
                <button
                  onClick={() => setSelectedServiceDetail(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-brand-panel flex items-center justify-center hover:bg-brand-hover text-main border border-brand-border"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wide">
                      {selectedServiceDetail.name}
                    </h2>
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                      {selectedServiceDetail.pricing_type === 'custom' ? 'Custom Service Quote' : 'Variable Pricing Evaluation'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Evaluated Service Fee (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      placeholder="Enter final evaluated price"
                      value={variablePriceInput}
                      onChange={e => setVariablePriceInput(e.target.value)}
                      className="w-full px-4 py-3 bg-brand-panel border border-brand-border rounded-xl text-sm font-black text-main focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-brand-muted mt-1">
                      Base catalog starting price: ₱{parseFloat(selectedServiceDetail.base_price || 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Reason for Price Adjustment * (Audit Trail)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Component-level diagnostic & ultrasonic cleaning required"
                      value={priceReasonInput}
                      onChange={e => setPriceReasonInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Device Type (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gaming PC / Laptop"
                        value={deviceTypeInput}
                        onChange={e => setDeviceTypeInput(e.target.value)}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Device Specs (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RTX 3060, i5 12400"
                        value={deviceSpecsInput}
                        onChange={e => setDeviceSpecsInput(e.target.value)}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Customer Problem / Symptoms Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Freezes during boot sequence..."
                      value={reportedIssueInput}
                      onChange={e => setReportedIssueInput(e.target.value)}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none custom-scrollbar"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setSelectedServiceDetail(null)}
                      className="px-5 py-2.5 bg-brand-panel hover:bg-brand-hover text-brand-muted font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmVariableService}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2"
                    >
                      <CheckCircle2 size={15} /> Add to Order (₱{parseFloat(variablePriceInput || 0).toLocaleString()})
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
                          key={`${item.id}-${item.isService ? 'svc' : 'prod'}`}
                          onClick={() => {
                            if (!item.isService) {
                              const invItem = inventory.find(i => i.product_id === item.id);
                              if (invItem) {
                                handleProductCustomize(invItem);
                              }
                            }
                          }}
                          className={`bg-brand-surface rounded-3xl p-5 border ${
                            item.isService ? 'border-purple-500/30' : 'border-brand-border'
                          } shadow-sm dark:shadow-none flex items-center justify-between gap-6 cursor-pointer hover:border-brand-neonblue/20 dark:hover:border-brand-neonblue/40 transition-all`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Image / Icon Box */}
                            <div className={`w-16 h-16 rounded-xl ${item.isService ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-brand-panel border border-brand-border'} flex items-center justify-center shrink-0 overflow-hidden`}>
                              {item.isService ? <Wrench size={24} className="stroke-[1.5px]" /> : <Package size={24} className="text-brand-muted stroke-[1.5px]" />}
                            </div>
                            
                            {/* Title / Meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  item.isService ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                }`}>
                                  {item.isService ? 'Technical Service' : 'Physical Product'}
                                </span>
                                {item.isBundleItem && (
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    item.isCustomizedBundle
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                      : 'bg-brand-neonpurple/20 text-brand-neonpurple border border-brand-neonpurple/40'
                                  }`}>
                                    {item.isCustomizedBundle ? <Sparkles size={10} /> : <Layers size={10} />}
                                    <span>{item.bundleName || "Bundle Item"}</span>
                                  </span>
                                )}
                                {item.sku && <p className="text-[9px] font-mono text-brand-muted tracking-wider">{item.sku}</p>}
                              </div>

                              <h4 className="text-sm font-rajdhani font-black text-main uppercase tracking-wide leading-tight truncate mt-1">
                                {item.name}
                              </h4>
                              
                              {/* Variant / Addon descriptors */}
                              <p className="text-[10px] font-bold text-main mt-1.5 bg-brand-panel border border-brand-border inline-block px-2.5 py-0.5 rounded-lg leading-relaxed">
                                {item.selectionSummary}
                              </p>
                            </div>
                          </div>

                          {/* Quantity Counter & Price Column */}
                          <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 bg-brand-panel border border-brand-border rounded-xl p-1 shrink-0">
                              <button
                                onClick={() => updateQuantity(item.id, -1, item.isService)}
                                className="w-7 h-7 bg-brand-surface rounded-lg hover:bg-brand-hover flex items-center justify-center text-main transition-colors border border-brand-border"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-black min-w-[20px] text-center text-main">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1, item.isService)}
                                className="w-7 h-7 bg-brand-surface rounded-lg hover:bg-brand-hover flex items-center justify-center text-main transition-colors border border-brand-border"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <div className="text-right min-w-[80px]">
                              <span className="text-sm font-rajdhani font-black text-main">
                                ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id, item.isService)}
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
                            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">
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
                            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2">
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

                  {/* Target Branch selection for Super Admin */}
                  {user?.role === "super_admin" && (
                    <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-muted leading-none">
                          Target Branch (Required)
                        </h4>
                        <span className="text-[9px] font-bold text-brand-neonblue uppercase">Super Admin</span>
                      </div>
                      <select
                        value={selectedBranchId || ""}
                        onChange={handleBranchChange}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3 text-xs font-bold text-main outline-none focus:border-brand-neonblue/40 cursor-pointer"
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.id} className="bg-brand-surface text-main">
                            🏪 {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                    {productSubtotal > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1.5"><Package size={12} className="text-cyan-400" /> Physical Products</span>
                        <span className="text-main font-bold">₱{productSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {serviceSubtotal > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1.5"><Wrench size={12} className="text-purple-400" /> Technical Services</span>
                        <span className="text-main font-bold">₱{serviceSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-brand-border/40 pt-1.5">
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
                      <span>VATable Sales</span>
                      <span className="text-main font-bold">₱{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>{t[language].tax}</span>
                      <span className="text-main font-bold">₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted block">Total Due</span>
                      <span className="text-[8px] font-bold text-brand-muted/70 uppercase tracking-wider">VAT-Inclusive</span>
                    </div>
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted mb-2 font-sans">
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

      {/* BUNDLE CUSTOMIZATION MODAL FOR STAFF IN POS */}
      <AnimatePresence>
        {selectedBundleForCustomization && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-brand-surface rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-brand-border shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-neonpurple/10 border border-brand-neonpurple/20 flex items-center justify-center text-brand-neonpurple">
                    <Layers size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-rajdhani font-black text-main uppercase tracking-wide">
                        {selectedBundleForCustomization.name}
                      </h2>
                      {isBundleCustomized ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Sparkles size={10} /> Customized
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-neonpurple/15 text-brand-neonpurple border border-brand-neonpurple/30">
                          Original Package
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-brand-muted uppercase tracking-widest font-bold">
                      Transaction-level customization • Master bundle remains protected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBundleForCustomization(null);
                    setReplacingBundleItemId(null);
                  }}
                  className="p-2 text-brand-muted hover:text-brand-crimson rounded-full hover:bg-brand-crimson/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* Replacing item notification banner */}
                {replacingBundleItemId && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-main">
                      <ArrowLeftRight size={16} className="text-amber-400 shrink-0" />
                      <span>
                        Swapping: <strong className="text-amber-400 font-black">{bundleCustomItems.find(i => i.id === replacingBundleItemId)?.name}</strong>. Choose a replacement from branch inventory below.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplacingBundleItemId(null)}
                      className="px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-[10px] font-black uppercase tracking-wider text-brand-muted hover:text-main shrink-0 ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Bundle Products List */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                      Included Products ({bundleCustomItems.length})
                    </span>
                    <span className="text-[10px] font-mono font-bold text-brand-neonpurple">
                      Items Retail Sum: ₱{bundleCalculatedPricing.currentRetailSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {bundleCustomItems.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-brand-border rounded-2xl bg-brand-bgbase text-brand-muted text-xs">
                      All products removed. Use the product selector below to add replacement items.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {bundleCustomItems.map((item) => {
                        const isBeingReplaced = replacingBundleItemId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              isBeingReplaced
                                ? "bg-amber-500/10 border-amber-500/60 shadow-lg"
                                : "bg-brand-bgbase border-brand-border hover:border-brand-neonpurple/30"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-main truncate capitalize">{item.name}</p>
                                {isBeingReplaced && (
                                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500 text-black">
                                    Replacing
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-brand-muted font-mono mt-0.5">
                                ₱{item.price.toLocaleString()} each • Total:{" "}
                                <span className="text-main font-bold">₱{(item.price * item.quantity).toLocaleString()}</span>
                                {item.sku && <span className="ml-2 text-brand-muted/70 uppercase">[{item.sku}]</span>}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-1.5 bg-brand-surface p-1 rounded-xl border border-brand-border">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBundleItemQty(item.id, -1)}
                                  className="w-6 h-6 rounded-lg bg-brand-bgbase border border-brand-border flex items-center justify-center text-brand-muted hover:text-main text-xs font-black"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center text-xs font-mono font-black text-main">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBundleItemQty(item.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-brand-bgbase border border-brand-border flex items-center justify-center text-brand-muted hover:text-main text-xs font-black"
                                >
                                  +
                                </button>
                              </div>

                              {/* Replace / Swap Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBeingReplaced) {
                                    setReplacingBundleItemId(null);
                                  } else {
                                    handleStartReplaceBundleItem(item.id);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                  isBeingReplaced
                                    ? "bg-amber-500 text-black shadow-sm"
                                    : "bg-brand-surface border border-brand-border text-brand-muted hover:text-amber-400 hover:border-amber-400/40"
                                }`}
                                title="Replace product with another from branch inventory"
                              >
                                <ArrowLeftRight size={12} />
                                <span>{isBeingReplaced ? "Cancel" : "Replace"}</span>
                              </button>

                              {/* Remove Product Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveBundleItem(item.id)}
                                className="p-1.5 text-brand-muted hover:text-brand-crimson hover:bg-brand-crimson/10 rounded-lg transition-colors"
                                title="Remove product from bundle"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add / Replace Products from Branch Inventory */}
                <div className="pt-4 border-t border-brand-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
                      {replacingBundleItemId ? "Select Replacement Product" : "Add Products to Bundle"}
                    </span>
                    <span className="text-[9px] text-brand-muted font-bold">
                      Showing branch inventory with available stock
                    </span>
                  </div>

                  <div className="relative mb-3">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input
                      type="text"
                      value={bundleProductSearch}
                      onFocus={() => setBundleProductPickerOpen(true)}
                      onChange={e => {
                        setBundleProductSearch(e.target.value);
                        setBundleProductPickerOpen(true);
                      }}
                      placeholder={replacingBundleItemId ? "Search replacement product by name or SKU..." : "Search branch inventory to add to bundle..."}
                      className={`w-full bg-brand-bgbase border rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-main placeholder:text-brand-muted/50 focus:outline-none transition-colors ${
                        replacingBundleItemId ? "border-amber-500/50 focus:border-amber-500" : "border-brand-border focus:border-brand-neonpurple"
                      }`}
                    />
                  </div>

                  {bundleProductPickerOpen && (
                    <div className="border border-brand-border rounded-2xl bg-brand-bgbase p-2.5 max-h-52 overflow-y-auto custom-scrollbar space-y-1.5">
                      {inventory
                        .filter(inv => {
                          const prod = inv.Product || inv;
                          if (!prod || !prod.id) return false;
                          const stock = (inv.stock !== undefined && inv.stock !== null) ? Number(inv.stock) : Number(inv.quantity || 0);
                          if (stock <= 0 || inv.enabled === false) return false;
                          if (!bundleProductSearch) return true;
                          const q = bundleProductSearch.toLowerCase().trim();
                          const matchName = (prod.name || "").toLowerCase().includes(q);
                          const matchSku = (prod.sku || "").toLowerCase().includes(q);
                          const matchPrice = String(prod.price || "").includes(q);
                          return matchName || matchSku || matchPrice;
                        })
                        .slice(0, 20)
                        .map(inv => {
                          const prod = inv.Product || inv;
                          const stock = (inv.stock !== undefined && inv.stock !== null) ? Number(inv.stock) : Number(inv.quantity || 0);
                          return (
                            <div
                              key={prod.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-neonpurple/30 transition-colors"
                            >
                              <div className="truncate pr-2 text-xs">
                                <span className="font-bold text-main block truncate capitalize">{prod.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-brand-neonpurple font-bold font-mono">₱{parseFloat(prod.price || 0).toLocaleString()}</span>
                                  <span className="text-[9px] text-emerald-400 font-black uppercase">Stock: {stock}</span>
                                  {prod.sku && <span className="text-[9px] text-brand-muted font-mono uppercase">[{prod.sku}]</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddProductToBundleCustomization(inv)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 transition-all ${
                                  replacingBundleItemId
                                    ? "bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-sm"
                                    : "bg-brand-neonpurple hover:bg-brand-neonpurple/80 text-white"
                                }`}
                              >
                                {replacingBundleItemId ? (
                                  <>
                                    <ArrowLeftRight size={12} /> Select as Replacement
                                  </>
                                ) : (
                                  <>
                                    <Plus size={12} /> Add
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      {inventory.filter(inv => {
                        const prod = inv.Product || inv;
                        const stock = (inv.stock !== undefined && inv.stock !== null) ? Number(inv.stock) : Number(inv.quantity || 0);
                        return stock > 0 && inv.enabled !== false;
                      }).length === 0 && (
                        <p className="text-center text-xs text-brand-muted py-6">No products currently in stock for this branch.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer with Dynamic Price Recalculation Breakdown */}
              <div className="p-5 border-t border-brand-border bg-brand-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-muted font-black uppercase block">
                      {isBundleCustomized ? "Customized Transaction Total" : "Package Price"}
                    </span>
                    {isBundleCustomized && bundleCalculatedPricing.savings > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Savings Applied: −₱{bundleCalculatedPricing.savings.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-rajdhani font-black text-brand-neonpurple">
                      ₱{bundleCalculatedPricing.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {isBundleCustomized && (
                      <span className="text-xs text-brand-muted line-through font-mono">
                        ₱{bundleCalculatedPricing.currentRetailSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBundleForCustomization(null);
                      setReplacingBundleItemId(null);
                    }}
                    className="px-5 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs text-brand-muted hover:text-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddBundleToOrder}
                    disabled={bundleCustomItems.length === 0}
                    className="btn-premium h-11 px-7 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <ShoppingCart size={15} />
                    <span>Add to Transaction</span>
                  </button>
                </div>
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
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-brand-muted mb-1">New Record</p>
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
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2 font-sans">
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
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2 font-sans">Branch</label>
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

      </div>
    </div>
  );
}
