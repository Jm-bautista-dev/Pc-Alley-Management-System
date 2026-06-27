const Branch = require('./Branch');
const ProductRequest = require('./ProductRequest');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Inventory = require('./Inventory');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Supplier = require('./Supplier');
const StockMovement = require('./StockMovement');
const ProductBundle = require('./ProductBundle');
const RestockRequest = require('./RestockRequest');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');

// New models
const Customer = require('./Customer');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const StockTransfer = require('./StockTransfer');
const StockTransferItem = require('./StockTransferItem');
const Expense = require('./Expense');
const Payroll = require('./Payroll');
const Attendance = require('./Attendance');
const Warranty = require('./Warranty');

// ── Existing Associations ──
Branch.hasMany(User, { foreignKey: 'branch_id' });
User.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Product, { foreignKey: 'branch_id' });
Product.belongsTo(Branch, { foreignKey: 'branch_id' });

Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Product.hasMany(Inventory, { foreignKey: 'product_id' });
Inventory.belongsTo(Product, { foreignKey: 'product_id' });

Branch.hasMany(Inventory, { foreignKey: 'branch_id' });
Inventory.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Order, { foreignKey: 'branch_id' });
Order.belongsTo(Branch, { foreignKey: 'branch_id' });

User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

Supplier.hasMany(Product, { foreignKey: 'supplier_id' });
Product.belongsTo(Supplier, { foreignKey: 'supplier_id' });

Product.hasMany(StockMovement, { foreignKey: 'product_id' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(StockMovement, { foreignKey: 'user_id' });
StockMovement.belongsTo(User, { foreignKey: 'user_id' });

Supplier.hasMany(StockMovement, { foreignKey: 'supplier_id' });
StockMovement.belongsTo(Supplier, { foreignKey: 'supplier_id' });

RestockRequest.belongsTo(Product, { foreignKey: 'product_id' });
RestockRequest.belongsTo(Branch, { foreignKey: 'branch_id' });
RestockRequest.belongsTo(User, { as: 'Manager', foreignKey: 'manager_id' });
RestockRequest.belongsTo(User, { as: 'Admin', foreignKey: 'admin_id' });

// ProductRequest associations
ProductRequest.belongsTo(Product, { foreignKey: 'product_id' });
ProductRequest.belongsTo(Branch, { foreignKey: 'branch_id' });
ProductRequest.belongsTo(User, { as: 'Requester', foreignKey: 'requested_by' });
ProductRequest.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });

Notification.belongsTo(User, { foreignKey: 'userId' });
Notification.belongsTo(Branch, { foreignKey: 'branchId' });
Branch.hasMany(Notification, { foreignKey: 'branchId' });

User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

Product.belongsToMany(Product, { as: 'BundleItems', through: ProductBundle, foreignKey: 'bundle_id', otherKey: 'product_id' });

// ── New Entity Associations ──

// Customer
Branch.hasMany(Customer, { foreignKey: 'branchId' });
Customer.belongsTo(Branch, { foreignKey: 'branchId' });

// Sale
Branch.hasMany(Sale, { foreignKey: 'branchId' });
Sale.belongsTo(Branch, { foreignKey: 'branchId' });

User.hasMany(Sale, { foreignKey: 'staffId' });
Sale.belongsTo(User, { foreignKey: 'staffId' });

Customer.hasMany(Sale, { foreignKey: 'customerId' });
Sale.belongsTo(Customer, { foreignKey: 'customerId' });

Sale.hasMany(SaleItem, { foreignKey: 'saleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

Product.hasMany(SaleItem, { foreignKey: 'productId' });
SaleItem.belongsTo(Product, { foreignKey: 'productId' });

// PurchaseOrder
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });

Branch.hasMany(PurchaseOrder, { foreignKey: 'branchId' });
PurchaseOrder.belongsTo(Branch, { foreignKey: 'branchId' });

PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'poId' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'poId' });

Product.hasMany(PurchaseOrderItem, { foreignKey: 'productId' });
PurchaseOrderItem.belongsTo(Product, { foreignKey: 'productId' });

// StockTransfer
Branch.hasMany(StockTransfer, { as: 'SourceTransfers', foreignKey: 'fromBranchId' });
StockTransfer.belongsTo(Branch, { as: 'SourceBranch', foreignKey: 'fromBranchId' });

Branch.hasMany(StockTransfer, { as: 'DestTransfers', foreignKey: 'toBranchId' });
StockTransfer.belongsTo(Branch, { as: 'DestBranch', foreignKey: 'toBranchId' });

StockTransfer.hasMany(StockTransferItem, { foreignKey: 'transferId' });
StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'transferId' });

Product.hasMany(StockTransferItem, { foreignKey: 'productId' });
StockTransferItem.belongsTo(Product, { foreignKey: 'productId' });

// Expense
Branch.hasMany(Expense, { foreignKey: 'branchId' });
Expense.belongsTo(Branch, { foreignKey: 'branchId' });

User.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(User, { foreignKey: 'userId' });

// Payroll
User.hasMany(Payroll, { foreignKey: 'userId' });
Payroll.belongsTo(User, { foreignKey: 'userId' });

// Attendance
User.hasMany(Attendance, { foreignKey: 'userId' });
Attendance.belongsTo(User, { foreignKey: 'userId' });

Branch.hasMany(Attendance, { foreignKey: 'branchId' });
Attendance.belongsTo(Branch, { foreignKey: 'branchId' });

module.exports = {
  Branch,
  User,
  Category,
  Product,
  ProductBundle,
  Inventory,
  Order,
  OrderItem,
  Supplier,
  StockMovement,
  RestockRequest,
  Notification,
  AuditLog,
  ProductRequest,
  
  // Export new models
  Customer,
  Sale,
  SaleItem,
  PurchaseOrder,
  PurchaseOrderItem,
  StockTransfer,
  StockTransferItem,
  Expense,
  Payroll,
  Attendance,
  Warranty
};
