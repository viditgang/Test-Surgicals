/**
 * Types and interfaces for the Divine Surgicals ERP
 */

export type UserRole = 'Owner' | 'Manager' | 'Accountant' | 'Sales Executive';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  pin?: string; // Secure 4-digit Passcode for simulation auth checking
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;    // YYYY-MM-DD
  currentStock: number;
  purchasePrice: number;
  unitPrice: number;     // Selling price
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  manufacturer: string;
  unitPrice: number;     // Selling price
  purchasePrice: number; // Purchase price
  gstRate: number;       // GST Percentage (e.g. 12 or 18)
  reorderLevel: number;
  currentStock: number;
  warehouseLocation: string;
  batchNumber: string;
  expiryDate: string;    // YYYY-MM-DD
  qrCodeValue?: string;
  batches?: ProductBatch[]; // Advanced Multi-batch tracking
}

export type InventoryActionType = 
  | 'Add Stock' 
  | 'Stock Adjustment' 
  | 'Transfer Stock' 
  | 'Damaged Stock Entry' 
  | 'Expired Stock Entry';

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  actionType: InventoryActionType;
  quantity: number;
  date: string;          // ISO Date
  user: string;
  notes: string;
  fromLocation?: string;
  toLocation?: string;
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: 'Purchase Invoice' | 'Payment';
  referenceId: string;   // PO ID or Payment ID
  amount: number;
  balanceAfter: number;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  gstNumber: string;
  address: string;
  paymentTerms: string;  // e.g. "Net 30", "COD"
  outstandingPayments: number;
  performanceScore: number; // Score out of 100
  preferred: boolean;
  ledger: SupplierLedgerEntry[];
}

export type POStatus = 'Draft' | 'Approved' | 'Received' | 'Paid';

export interface POItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  totalGst: number;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: POItem[];
  orderDate: string;
  status: POStatus;
  totalAmount: number;
  totalGst: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  billNumber?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gstNumber: string;
  outstandingPayments: number;
  creditLimit: number;
  lifetimeValue: number;
  state?: string; // State of Supply (e.g. Maharashtra, Karnataka, Out of State)
}

export interface PaymentReceipt {
  id: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  transactionRef?: string;
  notes?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;   // CGST split
  sgstAmount: number;   // SGST split
  igstAmount: number;   // IGST split
  totalAmount: number;
  batchNumber?: string; // Stock Batch billed
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGst: string;
  customerState?: string; // For GST rule splitting (intra vs. inter-state)
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  discount: number;
  date: string;          // ISO Date or Date String
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  qrCodeUrl?: string;
  createdBy: string;
  paymentsList?: PaymentReceipt[]; // Multiple payments logged per invoice
  amountPaid?: number;
  deliveryChallanId?: string;
  salesOrderId?: string;
}

// ADVANCED ERP SUB-ENTITIES

export interface GstNote {
  id: string;
  noteNumber: string; // e.g. CN-001 or DN-001
  type: 'Credit' | 'Debit';
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
  }>;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  reason: string; // e.g. "Goods Returned", "Over-billing Correction", "Discount Post-Invoice"
  gstReversed: boolean;
  createdBy: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string; // e.g. SO-001
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGst: string;
  hospitalPoNumber?: string; // Hospital's Purchase Order number
  date: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    totalAmount: number;
  }>;
  totalAmount: number;
  status: 'Draft' | 'Confirmed' | 'Invoiced' | 'Cancelled';
  notes?: string;
  createdBy: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string; // e.g. DC-001
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGst: string;
  date: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    totalAmount: number;
  }>;
  totalAmount: number;
  status: 'Draft' | 'Dispatched' | 'Invoiced';
  salesOrderId?: string;
  deliveryTerms?: string;
  vehicleNumber?: string;
  createdBy: string;
}

export interface BillingScheme {
  id: string;
  name: string;
  type: 'BuyXGetY' | 'FlatDiscount' | 'ManufacturerFunded';
  productIdX?: string; // buy product
  quantityX?: number;  // buy qty
  productIdY?: string; // get free product
  quantityY?: number;  // get free qty
  discountPercentage?: number; // for FlatDiscount
  manufacturerCode?: string; // for funding trace
  brandTarget?: string; // brand the flat % discount applies to
  active: boolean;
}

export type FinancialTransactionType = 'Income' | 'Expense';

export interface FinancialRecord {
  id: string;
  type: FinancialTransactionType;
  category: string;      // "Sales Revenue", "Purchase Expense", "Salaries", "Rent", "Utilities", "Other"
  amount: number;
  gstImpact: number;
  date: string;
  description: string;
  referenceId?: string;  // ID of Sales Invoice or PO
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: string;        // "Inventory", "Sales", "Purchase", "Supplier", "Finance", "User", "Sync"
  action: string;        // Description of action
  timestamp: string;     // ISO String
}

export interface SyncStatus {
  lastSyncedText: string;
  lastSyncedTime: string | null;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  source: 'OneDrive' | 'Google Sheets' | 'Local';
  log: Array<{
    id: string;
    timestamp: string;
    action: string;
    sheetName: string;
    rowsCount: number;
    type: 'upload' | 'download';
  }>;
}

export interface ERPData {
  products: Product[];
  inventoryLogs: InventoryLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  financialRecords: FinancialRecord[];
  activityLogs: ActivityLog[];
  syncStatus: SyncStatus;
  users: User[];
  rolePermissions?: Record<string, string[]>;
  appLogo?: string;
  appName?: string;
  sheetsUrl?: string;
  oneDriveUrl?: string;
  gstNotes?: GstNote[]; // Credit & Debit Notes
  salesOrders?: SalesOrder[]; // Hospital POS Orders
  deliveryChallans?: DeliveryChallan[]; // DC Dispatch tracking before invoicing
  billingSchemes?: BillingScheme[]; // Promo campaigns, brand flat offer adjustments
}
