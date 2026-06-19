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
}

export interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGst: string;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  discount: number;
  date: string;          // ISO Date or Date String
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  status: 'Paid' | 'Unpaid' | 'Overdue';
  qrCodeUrl?: string;
  createdBy: string;
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
}
