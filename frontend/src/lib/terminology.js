/**
 * PC Alley Centralized Terminology Standard
 * 
 * Standardizes visual labels, field names, buttons, headings, filters, badges,
 * and status text throughout the application to maintain consistent UI language.
 */

export const LABELS = {
  // Products & Catalog
  PRODUCTS: {
    singular: "Product",
    plural: "Products",
    catalog: "Product Catalog",
    list: "Product Catalog",
    add: "Add Product",
    edit: "Edit Product",
    delete: "Delete Product",
    import: "Import Products",
    name: "Product Name",
    description: "Product Description",
    sku: "Product SKU",
    barcode: "Product Barcode / SKU",
    sellingPrice: "Selling Price",
    costPrice: "Cost Price",
    stock: "Stock Quantity",
    initialStock: "Initial Stock Quantity",
    status: "Product Status",
    classification: "Product Classification",
    specifications: "Product Specifications"
  },

  // Product Categories
  CATEGORIES: {
    singular: "Product Category",
    plural: "Product Categories",
    management: "Product Categories",
    add: "Add Product Category",
    create: "Create Product Category",
    select: "Select Product Category",
    name: "Product Category Name",
    filter: "Filter by Category"
  },

  // Brands
  BRANDS: {
    singular: "Brand",
    plural: "Brands",
    directory: "Brand Directory",
    management: "Brand Directory",
    add: "Add Brand",
    create: "Create Brand",
    select: "Select Brand",
    name: "Brand Name",
    filter: "Filter by Brand",
    reports: "Brand Reports"
  },

  // Specifications
  SPECIFICATIONS: {
    label: "Product Specifications",
    shortLabel: "Specifications",
    placeholder: "e.g. 24GB GDDR6X, Boost Clock 2520 MHz, 384-bit, PCIe 4.0...",
    helperText: "Key technical details and hardware specifications"
  },

  // Customers
  CUSTOMERS: {
    singular: "Customer",
    plural: "Customers",
    registry: "Customer Registry",
    list: "Customer Registry",
    add: "Add Customer",
    search: "Search Customers",
    searchPlaceholder: "Search by customer name, email, or phone...",
    warranties: "Customer Warranties",
    walkIn: "Walk-in Customer",
    pricelist: "Customer Pricelist",
    exportPricelist: "Export Customer Pricelist",
    segment: "Customer Segment",
    totalSpent: "Total Revenue",
    totalOrders: "Total Orders"
  },

  // Staff & Personnel
  STAFF: {
    singular: "Staff Member",
    plural: "Staff",
    registry: "Staff Registry",
    personnelDirectory: "Personnel Directory",
    add: "Register Staff",
    roles: "Roles & Permissions",
    superAdmin: "Super Admin",
    branchAdmin: "Branch Admin",
    employee: "Staff",
    manager: "Branch Manager",
    technician: "Technician"
  },

  // Technical Services & Work Orders
  SERVICES: {
    singular: "Service",
    plural: "Services",
    catalog: "Service Catalog",
    workOrders: "Service Work Orders",
    jobs: "Service Work Orders",
    addService: "Add New Service",
    newWorkOrder: "New Work Order",
    createWorkOrder: "Create Work Order",
    jobNumber: "Work Order #",
    reportedIssue: "Reported Issue",
    deviceSpecs: "Device Specifications",
    statusPipeline: "Work Order Status"
  },

  // Sales & POS Terminal
  SALES: {
    singular: "Sale",
    plural: "Sales",
    all: "All Sales",
    pos: "Sales Terminal (POS)",
    terminal: "Sales Terminal",
    history: "Sales History",
    returns: "Sales Returns",
    drafts: "Saved Drafts",
    warranties: "Customer Warranties",
    shipments: "Shipments",
    discounts: "Discounts & Promos",
    invoiceNumber: "Invoice #",
    totalAmount: "Total Amount",
    paymentMethod: "Payment Method",
    amountPaid: "Amount Paid",
    changeAmount: "Change"
  },

  // Inventory & Stock Management
  INVENTORY: {
    singular: "Inventory",
    manageStock: "Manage Stock",
    stockLevels: "Stock Levels",
    summary: "Inventory Summary",
    status: "Stock Status",
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    deadStock: "Dead Stock",
    resync: "Resync Branch Inventory",
    repair: "Repair Inventory Records"
  },

  // Procurement & Stock Requests
  STOCK_REQUESTS: {
    singular: "Stock Request",
    plural: "Stock Requests",
    procurement: "Procurement",
    purchases: "Stock Purchases",
    requests: "Stock Requests",
    submit: "Submit Stock Request",
    newRequest: "New Stock Request",
    pending: "Pending Stock Requests",
    endorsed: "Endorsed to HQ",
    approved: "Approved Requests",
    fulfilled: "Fulfilled Requests",
    rejected: "Rejected Requests",
    branchHubs: "Branch Stock Request Hubs",
    desk: "Stock Requests Desk"
  },

  // Decision Intelligence & Forecasting
  FORECASTING: {
    title: "Sales Forecasting",
    subtitle: "Decision Intelligence & Demand Forecasting",
    history: "Historical Sales Data",
    projections: "Projected Sales & Demand",
    horizon: "Forecast Horizon",
    granularity: "Aggregation Period",
    model: "Forecasting Model",
    predictedRevenue: "Predicted Sales Revenue",
    predictedDemand: "Projected Demand"
  },

  // Model Benchmarking
  BENCHMARKING: {
    title: "Model Benchmarking",
    subtitle: "Algorithm Backtesting & Evaluation",
    runs: "Benchmark Runs",
    metric: "Evaluation Metric",
    validationWindow: "Validation Window",
    bestModel: "Recommended Forecasting Model",
    guide: "Methodology Guide"
  },

  // Prescriptive Analytics
  PRESCRIPTIVE_ANALYTICS: {
    title: "Prescriptive Analytics",
    subtitle: "AI-Driven Action Intelligence & Recommendations",
    recommendations: "Inventory Recommendations",
    priority: "Action Priority",
    highPriority: "High Priority",
    mediumPriority: "Medium Priority",
    lowPriority: "Low Priority",
    increaseInventory: "Increase Inventory",
    reduceOverstock: "Reduce Overstock",
    promoteLowPerforming: "Promote Low-Performing Items",
    adjustPurchasing: "Adjust Purchasing Cadence"
  },

  // Universal Badges & Statuses
  STATUS: {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    ARCHIVED: "Archived",
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    PARTIALLY_APPROVED: "Partially Approved",
    IN_TRANSIT: "In Transit",
    FULFILLED: "Fulfilled",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    RECEIVED: "Received",
    DIAGNOSING: "Diagnosing",
    IN_PROGRESS: "In Progress",
    READY_FOR_RELEASE: "Ready for Release"
  },

  // Common Action Buttons
  ACTIONS: {
    SAVE: "Save Changes",
    CANCEL: "Cancel",
    DELETE: "Delete",
    EDIT: "Edit",
    CREATE: "Create",
    SEARCH: "Search",
    FILTER: "Filter",
    EXPORT: "Export",
    IMPORT: "Import",
    SYNC: "Sync",
    REFRESH: "Refresh",
    PRINT: "Print",
    SUBMIT: "Submit",
    CONFIRM: "Confirm"
  }
};

/**
 * Normalizes customer display names, safely substituting 'Walk-in Customer'
 * for empty, null, or generic client text.
 */
export function formatCustomerName(name) {
  if (!name || typeof name !== "string") return LABELS.CUSTOMERS.walkIn;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === "general client" || trimmed.toLowerCase() === "walk-in" || trimmed.toLowerCase() === "walk-in client") {
    return LABELS.CUSTOMERS.walkIn;
  }
  return trimmed;
}

/**
 * Normalizes role codes into standardized visual labels.
 */
export function formatRoleName(role) {
  switch (role?.toLowerCase()) {
    case "super_admin": return LABELS.STAFF.superAdmin;
    case "branch_admin": return LABELS.STAFF.branchAdmin;
    case "employee":
    case "staff": return LABELS.STAFF.employee;
    default: return role || "Staff";
  }
}

export default LABELS;
