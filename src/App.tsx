import React from "react";
import { ERPData, User, SyncStatus, Product, Supplier, Customer, PurchaseOrder, SalesInvoice, FinancialRecord, InventoryLog, SupplierLedgerEntry, InventoryActionType, POItem, InvoiceItem } from "./types";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import InventoryView from "./components/InventoryView";
import PurchaseView from "./components/PurchaseView";
import SalesView from "./components/SalesView";
import SupplierView from "./components/SupplierView";
import CustomerView from "./components/CustomerView";
import AccountsView from "./components/AccountsView";
import ReportsView from "./components/ReportsView";
import AIAssistantView from "./components/AIAssistantView";
import SettingsView from "./components/SettingsView";
import EmployeesView from "./components/EmployeesView";
import LoginView from "./components/LoginView";
import { Lock, ShieldAlert, Menu } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [currentTab, setCurrentTab] = React.useState("dashboard");
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [erpData, setErpData] = React.useState<ERPData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch complete ERP state from DB on mount using storage auth token
  const loadERPData = async (token?: string) => {
    const activeToken = token || localStorage.getItem("divine_erp_token") || "";
    try {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }
      const res = await fetch("/api/erp/data", { headers });
      if (res.status === 401) {
        localStorage.removeItem("divine_erp_token");
        setCurrentUser(null);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to contact the Dev Express application server node.");
      }
      const val = await res.json();
      setErpData(val);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  React.useEffect(() => {
    const checkAuthAndLoad = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem("divine_erp_token");
      if (token) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const body = await res.json();
            setCurrentUser(body.user);
            await loadERPData(token);
            setAuthLoading(false);
            return;
          }
        } catch (e) {
          console.error("Authentication check failed on mount:", e);
        }
      }
      localStorage.removeItem("divine_erp_token");
      setCurrentUser(null);
      setAuthLoading(false);
    };
    
    checkAuthAndLoad();
  }, []);

  const handleLoginSuccess = async (user: User, token: string) => {
    localStorage.setItem("divine_erp_token", token);
    setCurrentUser(user);
    await loadERPData(token);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("divine_erp_token");
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem("divine_erp_token");
    setCurrentUser(null);
    setErpData(null);
  };

  // Save localized client State back to backend configuration database
  const saveStateToServer = async (latestData: ERPData) => {
    const token = localStorage.getItem("divine_erp_token") || "";
    try {
      const res = await fetch("/api/erp/data", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(latestData)
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to write revised state logs back to server storage.");
      }
      const confirmedJson = await res.json();
      if (confirmedJson.success) {
        setErpData(latestData);
      }
    } catch (err: any) {
      console.error("Save state failed:", err);
      alert(`Network warning: State serialization failed [${err.message}].`);
    }
  };

  // Trigger spreadsheet sync simulation
  const handleTriggerSync = async (source: 'OneDrive' | 'Google Sheets') => {
    const token = localStorage.getItem("divine_erp_token") || "";
    setIsSyncing(true);
    try {
      const res = await fetch("/api/erp/sync-trigger", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ source })
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        throw new Error("Sync operation gateway failure.");
      }
      
      // reload updated state containing fresh log entries
      await loadERPData(token);
    } catch (err: any) {
      console.error(err);
      alert(`Sync Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform surgical adjustments (add stock/remove stock)
  const handleInventoryAction = async (payload: { productId: string; actionType: InventoryActionType; quantity: number; notes: string; user: string }) => {
    if (!erpData) return;
    const token = localStorage.getItem("divine_erp_token") || "";
    try {
      const res = await fetch("/api/erp/inventory-action", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to write transaction.");
      }
      await loadERPData(token);
    } catch (err: any) {
      console.error(err);
      alert(`Error committing inventory change: ${err.message}`);
    }
  };

  // Add Product creation
  const handleAddProduct = async (prod: Omit<Product, 'id' | 'qrCodeValue'>) => {
    if (!erpData) return;
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...prod,
      id: newId,
      qrCodeValue: `divine-surgicals://product/${newId}`
    };

    const updatedData: ERPData = {
      ...erpData,
      products: [...erpData.products, newProduct],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Inventory",
          action: `Created new surgical product catalog entry for "${newProduct.name}"`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Add Customer Registration
  const handleAddCustomer = async (cust: Omit<Customer, 'id' | 'outstandingPayments' | 'lifetimeValue'>) => {
    if (!erpData) return;
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      outstandingPayments: 0,
      lifetimeValue: 0
    };

    const updatedData: ERPData = {
      ...erpData,
      customers: [...erpData.customers, newCust],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "CRM",
          action: `Registered new regional medical institution client "${newCust.name}"`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Credit Adjustment Slider Action
  const handleAdjustCredit = async (customerId: string, newLimit: number) => {
    if (!erpData) return;
    const list = erpData.customers.map(c => {
      if (c.id === customerId) {
        return { ...c, creditLimit: newLimit };
      }
      return c;
    });

    const targetCustomer = erpData.customers.find(c => c.id === customerId);
    const updatedData: ERPData = {
      ...erpData,
      customers: list,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Credit Control",
          action: `Adjusted credit limit parameters for client "${targetCustomer?.name || customerId}" to limits ${newLimit}`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Add Supplier Registration
  const handleAddSupplier = async (supp: Omit<Supplier, 'id' | 'outstandingPayments' | 'performanceScore' | 'ledger' | 'preferred'>) => {
    if (!erpData) return;
    const newSupp: Supplier = {
      ...supp,
      id: `supp-${Date.now()}`,
      outstandingPayments: 0,
      performanceScore: 90,
      ledger: [],
      preferred: true
    };

    const updatedData: ERPData = {
      ...erpData,
      suppliers: [...erpData.suppliers, newSupp],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Logistics",
          action: `Onboarded manufacturer/supplier sourcing partner "${newSupp.name}"`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Settle supplier invoice payments
  const handleReleasePayment = async (supplierId: string, amount: number, notes: string) => {
    if (!erpData) return;
    const latestList = erpData.suppliers.map(s => {
      if (s.id === supplierId) {
        const nextBalance = Math.max(0, s.outstandingPayments - amount);
        const entry: SupplierLedgerEntry = {
          id: `led-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: "Payment",
          referenceId: `TXN-${Date.now().toString().slice(-4)}`,
          description: notes || "Credit balance settled",
          amount,
          balanceAfter: nextBalance
        };
        return {
          ...s,
          outstandingPayments: nextBalance,
          ledger: [entry, ...s.ledger]
        };
      }
      return s;
    });

    // Add corresponding outbound Expense to Account Ledgers so income/expense is synchronized
    const expRecord: FinancialRecord = {
      id: `fin-${Date.now()}`,
      type: "Expense",
      category: "Other Logistics",
      amount,
      gstImpact: 0,
      date: new Date().toISOString().split('T')[0],
      description: `Settled manufacturer credit notes for ${erpData.suppliers.find(s => s.id === supplierId)?.name || supplierId}`
    };

    const updatedData: ERPData = {
      ...erpData,
      suppliers: latestList,
      financialRecords: [expRecord, ...erpData.financialRecords],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Finance Ledger",
          action: `Recorded financial settlement payment of ₹${amount} for manufacturer: ${erpData.suppliers.find(s => s.id === supplierId)?.name || supplierId}`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Create purchase order draft
  const handleCreatePO = async (po: Omit<PurchaseOrder, 'id'>) => {
    if (!erpData) return;
    const newPO: PurchaseOrder = {
      ...po,
      id: `po-${Date.now()}`
    };

    const updatedData: ERPData = {
      ...erpData,
      purchaseOrders: [...erpData.purchaseOrders, newPO],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Procurement",
          action: `Drafted manufacturing Purchase Order "${newPO.poNumber}" for ${newPO.supplierName}`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Approve PO draft
  const handleApprovePO = async (poId: string, approvedBy: string) => {
    if (!erpData) return;
    const list = erpData.purchaseOrders.map(po => {
      if (po.id === poId) {
        return { ...po, status: "Approved" as const };
      }
      return po;
    });

    const poObj = erpData.purchaseOrders.find(p => p.id === poId);
    const updatedData: ERPData = {
      ...erpData,
      purchaseOrders: list,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Procurement",
          action: `Authorized & Approved Purchase Order "${poObj?.poNumber || poId}" for logistics release.`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Receive items and adjust physical product inventory levels automatically
  const handleReceiveGoods = async (poId: string, receivedBy: string, billNumber: string) => {
    if (!erpData) return;
    const poObj = erpData.purchaseOrders.find(p => p.id === poId);
    if (!poObj) return;

    // Transition state
    const orderList = erpData.purchaseOrders.map(po => {
      if (po.id === poId) {
        return {
          ...po,
          status: "Received" as const,
          receivedBy,
          billNumber
        };
      }
      return po;
    });

    // Settle product stock increases and log audit trails
    const newInventoryLogs: InventoryLog[] = [];
    const productsList = erpData.products.map(p => {
      const matchItem = poObj.items.find(i => i.productId === p.id);
      if (matchItem) {
        newInventoryLogs.push({
          id: `log-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          actionType: "Add Stock",
          quantity: matchItem.quantity,
          date: new Date().toISOString(),
          user: receivedBy,
          notes: `Procured via PO: ${poObj.poNumber}, Bill ref: ${billNumber}`
        });
        return {
          ...p,
          currentStock: p.currentStock + matchItem.quantity
        };
      }
      return p;
    });

    // Settle supplier accounts liabilities (Increment balance we owe)
    const suppliersList = erpData.suppliers.map(s => {
      if (s.id === poObj.supplierId) {
        const nextBalance = s.outstandingPayments + poObj.totalAmount;
        const ledgerEntry: SupplierLedgerEntry = {
          id: `led-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: "Purchase Invoice",
          referenceId: poObj.poNumber,
          description: `Consignment stock received via bill #${billNumber}`,
          amount: poObj.totalAmount,
          balanceAfter: nextBalance
        };
        return {
          ...s,
          outstandingPayments: nextBalance,
          ledger: [ledgerEntry, ...s.ledger]
        };
      }
      return s;
    });

    // Add to corporate financial journals
    const outwardRecord: FinancialRecord = {
      id: `fin-out-${Date.now()}`,
      type: "Expense",
      category: "Other Logistics",
      amount: poObj.totalAmount,
      gstImpact: poObj.totalGst,
      date: new Date().toISOString().split('T')[0],
      description: `Logistics goods receipt from PO #${poObj.poNumber}`
    };

    const updatedData: ERPData = {
      ...erpData,
      purchaseOrders: orderList,
      products: productsList,
      suppliers: suppliersList,
      inventoryLogs: [...newInventoryLogs, ...erpData.inventoryLogs],
      financialRecords: [outwardRecord, ...erpData.financialRecords],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Fulfillment",
          action: `Received inbound consumables consignment for PO ${poObj.poNumber}. Consolidated and updated stocks.`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Checkout and issue sales invoice
  const handleCreateInvoice = async (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber'>) => {
    if (!erpData) return;
    const invNo = `DS-INV-${Date.now().toString().slice(-5)}`;
    const newInvoice: SalesInvoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: invNo
    };

    // Deduct stock levels from physical catalogs
    const newInventoryLogs: InventoryLog[] = [];
    const productsList = erpData.products.map(p => {
      const matchLine = invoice.items.find(it => it.productId === p.id);
      if (matchLine) {
        newInventoryLogs.push({
          id: `log-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          actionType: "Stock Adjustment",
          quantity: -matchLine.quantity,
          date: new Date().toISOString(),
          user: invoice.createdBy,
          notes: `Billed checkout via POS: ${invNo}`
        });
        return {
          ...p,
          currentStock: Math.max(0, p.currentStock - matchLine.quantity)
        };
      }
      return p;
    });

    // Increment Customer Lifetime Value (CLTV)
    const customersList = erpData.customers.map(c => {
      if (c.id === invoice.customerId) {
        return {
          ...c,
          lifetimeValue: c.lifetimeValue + invoice.grandTotal
        };
      }
      return c;
    });

    // Sync into financial journal index as raw corporate Income
    const incRecord: FinancialRecord = {
      id: `fin-inc-${Date.now()}`,
      type: "Income",
      category: "Sales Revenue",
      amount: invoice.grandTotal,
      gstImpact: invoice.totalGst,
      date: new Date().toISOString().split('T')[0],
      description: `POS Retail collections for invoice ${invNo}`
    };

    const updatedData: ERPData = {
      ...erpData,
      salesInvoices: [newInvoice, ...erpData.salesInvoices],
      products: productsList,
      customers: customersList,
      inventoryLogs: [...newInventoryLogs, ...erpData.inventoryLogs],
      financialRecords: [incRecord, ...erpData.financialRecords],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Sales checkout",
          action: `Billed retail customer "${invoice.customerName}" with invoice ${invNo} totaling ₹${invoice.grandTotal.toFixed(2)}`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Manual financial transaction adding
  const handleAddFinancialRecord = async (rec: Omit<FinancialRecord, 'id'>) => {
    if (!erpData) return;
    const newRec: FinancialRecord = {
      ...rec,
      id: `fin-${Date.now()}`
    };

    const updatedData: ERPData = {
      ...erpData,
      financialRecords: [newRec, ...erpData.financialRecords],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Accounts",
          action: `Authorized manual accounting post for "${newRec.category}" amounting to ₹${newRec.amount}`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  // Create customized employee identity logic
  const handleAddEmployee = async (newEmp: Omit<User, 'id'>) => {
    if (!erpData) return;
    const updatedUsers: User[] = [
      ...erpData.users,
      {
        ...newEmp,
        id: `user-${Date.now()}`
      }
    ];
    const updatedData: ERPData = {
      ...erpData,
      users: updatedUsers,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Security & Access",
          action: `Created new staff login credentials for operator "${newEmp.name}" (${newEmp.role})`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  const handleUpdateEmployee = async (updatedEmp: User) => {
    if (!erpData) return;
    const updatedUsers = erpData.users.map(u => u.id === updatedEmp.id ? updatedEmp : u);
    
    if (currentUser.id === updatedEmp.id) {
      setCurrentUser(updatedEmp);
    }

    const updatedData: ERPData = {
      ...erpData,
      users: updatedUsers,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Security & Access",
          action: `Updated access parameters and details for staff "${updatedEmp.name}" (${updatedEmp.role})`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!erpData) return;
    const target = erpData.users.find(u => u.id === userId);
    const updatedUsers = erpData.users.filter(u => u.id !== userId);
    
    const updatedData: ERPData = {
      ...erpData,
      users: updatedUsers,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Security & Access",
          action: `De-authorized and fully removed staff login node "${target?.name || userId}"`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  const handleUpdatePermissions = async (newPermissions: Record<string, string[]>) => {
    if (!erpData || !currentUser) return;
    const updatedData: ERPData = {
      ...erpData,
      rolePermissions: newPermissions,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Security & Access",
          action: "Modified workstation module authorization matrix configuration"
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  const handleSaveBranding = async (logoUrl: string, brandName: string, sheetsUrl?: string, oneDriveUrl?: string) => {
    if (!erpData || !currentUser) return;
    const updatedData: ERPData = {
      ...erpData,
      appLogo: logoUrl,
      appName: brandName,
      sheetsUrl,
      oneDriveUrl,
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Branding",
          action: `Updated corporate branding & cloud sync nodes. Active spreadsheet link updated.`
        },
        ...erpData.activityLogs
      ]
    };
    await saveStateToServer(updatedData);
  };

  const handleBulkImport = async (type: 'sales' | 'customers' | 'suppliers' | 'purchases' | 'inventory', items: any[]) => {
    if (!erpData || !currentUser) return;
    const token = localStorage.getItem("divine_erp_token") || "";
    const updatedData = { ...erpData };
    const timestamp = new Date().toISOString();

    if (type === 'customers') {
      const newCustomers: Customer[] = items.map((item, idx) => ({
        id: `cust-bulk-${Date.now()}-${idx}`,
        name: item.name || "Unnamed Client",
        mobile: item.mobile || "N/A",
        email: item.email || "",
        address: item.address || "Silchar",
        gstNumber: item.gstNumber || "18AAAGS000000ZP",
        outstandingPayments: Number(item.outstandingPayments) || 0,
        creditLimit: Number(item.creditLimit) || 200000,
        lifetimeValue: Number(item.lifetimeValue) || 0
      }));
      updatedData.customers = [...newCustomers, ...erpData.customers];
      updatedData.activityLogs = [
        {
          id: `act-${Date.now()}`,
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "CRM",
          action: `Bulk imported ${newCustomers.length} medical clients through CSV/Excel`
        },
        ...erpData.activityLogs
      ];
    } else if (type === 'suppliers') {
      const newSuppliers: Supplier[] = items.map((item, idx) => ({
        id: `supp-bulk-${Date.now()}-${idx}`,
        name: item.name || "Unnamed Supplier",
        contactPerson: item.contactPerson || "Contact Desk",
        mobileNumber: item.mobileNumber || "N/A",
        email: item.email || "",
        gstNumber: item.gstNumber || "18AABCS0000Z0ZP",
        address: item.address || "Assam",
        paymentTerms: item.paymentTerms || "Net 30",
        outstandingPayments: Number(item.outstandingPayments) || 0,
        performanceScore: Number(item.performanceScore) || 95,
        preferred: true,
        ledger: []
      }));
      updatedData.suppliers = [...newSuppliers, ...erpData.suppliers];
      updatedData.activityLogs = [
        {
          id: `act-${Date.now()}`,
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Logistics",
          action: `Bulk imported ${newSuppliers.length} manufacturer partners through CSV/Excel`
        },
        ...erpData.activityLogs
      ];
    } else if (type === 'purchases') {
      const poGroups: Record<string, any[]> = {};
      items.forEach(it => {
        const key = it.pONumber || `PO-BULK-${Date.now().toString().slice(-4)}`;
        if (!poGroups[key]) poGroups[key] = [];
        poGroups[key].push(it);
      });

      const newPOs: PurchaseOrder[] = Object.entries(poGroups).map(([poNum, rowItems], idx) => {
        const first = rowItems[0];
        const supplierObj = erpData.suppliers.find(s => s.name.toLowerCase() === (first.supplierName || "").toLowerCase()) || erpData.suppliers[0];
        
        let totalVal = 0;
        let totalGstVal = 0;
        
        const parsedItems: POItem[] = rowItems.map(ri => {
          const prod = erpData.products.find(p => p.sku.toLowerCase() === (ri.productSku || "").toLowerCase() || p.name.toLowerCase() === (ri.productSku || "").toLowerCase()) || erpData.products[0];
          const qty = Number(ri.quantity) || 10;
          const uPrice = Number(ri.purchasePrice) || (prod ? prod.purchasePrice : 150);
          const gstRate = prod ? prod.gstRate : 12;
          const sub = qty * uPrice;
          const gst = (sub * gstRate) / 100;
          const total = sub + gst;
          
          totalVal += total;
          totalGstVal += gst;
          
          return {
            productId: prod ? prod.id : "prod-temp",
            name: prod ? prod.name : (ri.productSku || "Disposable Syringe 10ml"),
            sku: prod ? prod.sku : (ri.productSku || "DISP-10ML"),
            quantity: qty,
            purchasePrice: uPrice,
            gstRate,
            totalGst: gst,
            totalAmount: total
          };
        });

        return {
          id: `po-bulk-${Date.now()}-${idx}`,
          poNumber: poNum,
          supplierId: supplierObj ? supplierObj.id : "supp-1",
          supplierName: supplierObj ? supplierObj.name : (first.supplierName || "Assam Surgical Mfg Co"),
          items: parsedItems,
          orderDate: first.date || new Date().toISOString().split('T')[0],
          status: 'Received',
          totalAmount: totalVal,
          totalGst: totalGstVal,
          notes: first.notes || "Bulk spreadsheet upload",
          receivedAt: new Date().toISOString(),
          receivedBy: currentUser.name,
          billNumber: `BILL-${Date.now().toString().slice(-4)}`
        };
      });

      updatedData.purchaseOrders = [...newPOs, ...erpData.purchaseOrders];
      
      // Update inventory stock for these received purchase goods
      newPOs.forEach(po => {
        po.items.forEach(itm => {
          const pIdx = updatedData.products.findIndex(p => p.id === itm.productId);
          if (pIdx !== -1) {
            updatedData.products[pIdx] = {
              ...updatedData.products[pIdx],
              currentStock: updatedData.products[pIdx].currentStock + itm.quantity
            };
          }
        });
      });

      updatedData.activityLogs = [
        {
          id: `act-${Date.now()}`,
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Purchases",
          action: `Bulk imported ${newPOs.length} purchase consignment ledger records`
        },
        ...erpData.activityLogs
      ];
    } else if (type === 'sales') {
      const invGroups: Record<string, any[]> = {};
      items.forEach(it => {
        const key = it.invoiceNumber || `INV-BULK-${Date.now().toString().slice(-4)}`;
        if (!invGroups[key]) invGroups[key] = [];
        invGroups[key].push(it);
      });

      const newInvoices: SalesInvoice[] = Object.entries(invGroups).map(([invNum, rowItems], idx) => {
        const first = rowItems[0];
        const customerObj = erpData.customers.find(c => c.name.toLowerCase() === (first.customerName || "").toLowerCase()) || erpData.customers[0];
        
        let subtotal = 0;
        let totalGst = 0;
        
        const parsedItems: InvoiceItem[] = rowItems.map(ri => {
          const prod = erpData.products.find(p => p.sku.toLowerCase() === (ri.productSkuOrName || "").toLowerCase() || p.name.toLowerCase() === (ri.productSkuOrName || "").toLowerCase()) || erpData.products[0];
          const qty = Number(ri.quantity) || 1;
          const uPrice = Number(ri.unitPrice) || (prod ? prod.unitPrice : 200);
          const gstRate = prod ? prod.gstRate : 12;
          const sub = qty * uPrice;
          const gst = (sub * gstRate) / 100;
          const total = sub + gst;
          
          subtotal += sub;
          totalGst += gst;
          
          return {
            productId: prod ? prod.id : "prod-temp",
            name: prod ? prod.name : (ri.productSkuOrName || "Surgical Item"),
            sku: prod ? prod.sku : (ri.productSkuOrName || "SURG-ITEM"),
            quantity: qty,
            unitPrice: uPrice,
            gstRate,
            gstAmount: gst,
            cgstAmount: gst / 2,
            sgstAmount: gst / 2,
            igstAmount: 0,
            totalAmount: total
          };
        });

        const grandTotal = subtotal + totalGst;

        return {
          id: `inv-bulk-${Date.now()}-${idx}`,
          invoiceNumber: invNum,
          customerId: customerObj ? customerObj.id : "custom",
          customerName: customerObj ? customerObj.name : (first.customerName || "Walk-In Client"),
          customerMobile: customerObj ? customerObj.mobile : (first.customerMobile || ""),
          customerGst: customerObj ? customerObj.gstNumber : (first.customerGst || "18AAAGS000000ZP"),
          items: parsedItems,
          subtotal,
          totalGst,
          totalCgst: totalGst / 2,
          totalSgst: totalGst / 2,
          totalIgst: 0,
          grandTotal,
          discount: 0,
          date: first.date || new Date().toISOString().split('T')[0],
          paymentMethod: first.paymentMethod || "UPI",
          status: first.status || "Paid",
          createdBy: currentUser.name
        };
      });

      updatedData.salesInvoices = [...newInvoices, ...erpData.salesInvoices];

      newInvoices.forEach(inv => {
        const cIdx = updatedData.customers.findIndex(c => c.id === inv.customerId);
        if (cIdx !== -1) {
          updatedData.customers[cIdx] = {
            ...updatedData.customers[cIdx],
            lifetimeValue: updatedData.customers[cIdx].lifetimeValue + inv.grandTotal,
            outstandingPayments: inv.status === 'Paid' ? updatedData.customers[cIdx].outstandingPayments : updatedData.customers[cIdx].outstandingPayments + inv.grandTotal
          };
        }
        
        // Deduct inventory stock for these sold goods
        inv.items.forEach(itm => {
          const pIdx = updatedData.products.findIndex(p => p.id === itm.productId);
          if (pIdx !== -1) {
            updatedData.products[pIdx] = {
              ...updatedData.products[pIdx],
              currentStock: Math.max(0, updatedData.products[pIdx].currentStock - itm.quantity)
            };
          }
        });
      });

      const financialRecords = newInvoices.map((inv, i) => ({
        id: `fin-bulk-${Date.now()}-${i}`,
        type: "Income" as const,
        category: "Sales Revenue",
        amount: inv.grandTotal,
        gstImpact: inv.totalGst,
        date: inv.date,
        description: `Bulk Excel Sale Invoice ${inv.invoiceNumber} for ${inv.customerName}`
      }));

      updatedData.financialRecords = [...financialRecords, ...updatedData.financialRecords];

      updatedData.activityLogs = [
        {
          id: `act-${Date.now()}`,
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Sales Module",
          action: `Bulk imported ${newInvoices.length} general sales receipt invoices`
        },
        ...erpData.activityLogs
      ];
    } else if (type === 'inventory') {
      const newProducts: Product[] = items.map((item, idx) => ({
        id: `prod-bulk-${Date.now()}-${idx}`,
        name: item.name || "Unnamed Product",
        sku: (item.sku || "").toUpperCase(),
        category: item.category || "Consumables",
        brand: item.brand || "Generic",
        manufacturer: item.manufacturer || "Unknown",
        unitPrice: Number(item.unitPrice) || 0,
        purchasePrice: Number(item.purchasePrice) || 0,
        gstRate: Number(item.gstRate) || 12,
        reorderLevel: Number(item.reorderLevel) || 100,
        currentStock: Number(item.currentStock) || 0,
        warehouseLocation: item.warehouseLocation || "Main Warehouse",
        batchNumber: item.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: item.expiryDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
      }));

      const updatedProductsList = [...updatedData.products];
      let updatedCount = 0;
      let addedCount = 0;

      newProducts.forEach((newP) => {
        const existingIdx = updatedProductsList.findIndex(p => p.sku.toLowerCase() === newP.sku.toLowerCase());
        if (existingIdx !== -1) {
          updatedProductsList[existingIdx] = {
            ...updatedProductsList[existingIdx],
            name: newP.name !== "Unnamed Product" ? newP.name : updatedProductsList[existingIdx].name,
            category: newP.category !== "Consumables" ? newP.category : updatedProductsList[existingIdx].category,
            brand: newP.brand !== "Generic" ? newP.brand : updatedProductsList[existingIdx].brand,
            manufacturer: newP.manufacturer !== "Unknown" ? newP.manufacturer : updatedProductsList[existingIdx].manufacturer,
            unitPrice: newP.unitPrice > 0 ? newP.unitPrice : updatedProductsList[existingIdx].unitPrice,
            purchasePrice: newP.purchasePrice > 0 ? newP.purchasePrice : updatedProductsList[existingIdx].purchasePrice,
            gstRate: newP.gstRate,
            reorderLevel: newP.reorderLevel,
            currentStock: updatedProductsList[existingIdx].currentStock + newP.currentStock,
            warehouseLocation: newP.warehouseLocation !== "Main Warehouse" ? newP.warehouseLocation : updatedProductsList[existingIdx].warehouseLocation,
            batchNumber: newP.batchNumber,
            expiryDate: newP.expiryDate
          };
          updatedCount++;
        } else {
          updatedProductsList.push(newP);
          addedCount++;
        }
      });

      updatedData.products = updatedProductsList;

      updatedData.activityLogs = [
        {
          id: `act-${Date.now()}`,
          timestamp,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Inventory",
          action: `Bulk imported ${newProducts.length} articles (${addedCount} added, ${updatedCount} merged/updated)`
        },
        ...erpData.activityLogs
      ];
    }

    await saveStateToServer(updatedData);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl max-w-md shadow-lg space-y-3">
          <h2 className="text-sm font-bold text-rose-800 uppercase tracking-widest">Database Node Missing</h2>
          <p className="text-xs text-slate-500 font-medium">Please restart the dev database server or check credentials.</p>
          <button 
            onClick={() => loadERPData()}
            className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-bold"
          >
            Retry Contact Gateway
          </button>
        </div>
      </div>
    );
  }

  // Workstation authentication gateway loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans select-none">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#0F4C81] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-bold tracking-tight">Initiating secure medical ERP workstation...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, route immediately to the secure LoginView
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={handleLoginSuccess} 
        appLogo={erpData?.appLogo} 
        appName={erpData?.appName || "Divine Surgicals"} 
      />
    );
  }

  if (!erpData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center">
        <div className="space-y-2 animate-pulse">
          <p className="text-sm font-bold text-[#0F4C81]">Loading Divine Surgicals ERP Engine...</p>
          <p className="text-xs text-slate-400">Consolidating Excel sheet buffers and transaction logs.</p>
        </div>
      </div>
    );
  }

  // Count metrics for notifications
  const lowStockCount = erpData.products.filter(p => p.currentStock <= p.minStockLevel).length;
  
  const today = new Date();
  const expiringSoonCount = erpData.products.filter(p => {
    const exp = new Date(p.expiryDate);
    const diff = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  }).length;

  // Access control checking
  const activeRolePermissions = erpData.rolePermissions || {
    "Owner": ["dashboard", "inventory", "purchases", "sales", "suppliers", "customers", "finance", "reports", "employees", "ai-assistant", "settings"],
    "Manager": ["dashboard", "inventory", "purchases", "suppliers", "customers", "reports", "ai-assistant"],
    "Accountant": ["dashboard", "purchases", "sales", "suppliers", "customers", "finance", "reports", "ai-assistant"],
    "Sales Executive": ["dashboard", "inventory", "sales", "customers", "ai-assistant"]
  };

  const isTabPermitted = (activeRolePermissions[currentUser.role] || []).includes(currentTab);

  return (
    <div className="min-h-screen bg-[#F8FBFF] flex flex-col font-sans">
      
      {/* Minimalistic Mobile Top Bar (Hidden on desktops) */}
      <div className="md:hidden bg-white border-b border-slate-150 p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 hover:bg-slate-50 border border-slate-200 active:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
            title="Open navigation pane"
          >
            <Menu size={18} />
          </button>
          <span className="font-extrabold text-xs text-[#0F4C81]">{erpData.appName || "Divine Surgicals"}</span>
        </div>
        <span className="text-[10px] bg-blue-50 text-[#0F4C81] px-2 py-0.5 rounded font-mono font-bold uppercase">Active Hub</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Navigation Sidebar */}
        <Sidebar 
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          lowStockCount={lowStockCount}
          expiringSoonCount={expiringSoonCount}
          isOpenOnMobile={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          appLogo={erpData.appLogo}
          appName={erpData.appName}
          currentUser={currentUser}
          onLogout={handleLogout}
          syncStatus={erpData.syncStatus}
          triggerSync={handleTriggerSync}
          isSyncing={isSyncing}
          sheetsUrl={erpData.sheetsUrl}
          oneDriveUrl={erpData.oneDriveUrl}
        />

        {/* Content canvas container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-x-hidden w-full">
          
          {!isTabPermitted ? (
            <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-md max-w-2xl mx-auto space-y-6 animate-fade-in text-center my-12 font-sans">
              <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Lock size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-850 tracking-tight">Access Control Protection Lockout</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  The clinical logistics segment <strong>'{currentTab.toUpperCase()}'</strong> is restricted under your active workstation role clearance of <strong>{currentUser.role}</strong>.
                </p>
              </div>

              <div className="bg-[#FAFBFD] p-5 rounded-2xl border border-slate-150 text-left text-xs max-w-md mx-auto space-y-2">
                <p className="font-bold text-[#0F4C81] flex items-center gap-1">
                  <ShieldAlert size={14} className="text-rose-500" /> Workstation Identity Node:
                </p>
                <div className="grid grid-cols-2 gap-y-1 font-mono text-[10px] text-slate-500 leading-normal border-t border-slate-100 pt-2">
                  <span>OPERATOR ID:</span> <span className="font-bold text-slate-700">{currentUser.id}</span>
                  <span>NAME:</span> <span className="font-bold text-slate-700">{currentUser.name}</span>
                  <span>CLEARANCE LEVEL:</span> <span className="font-bold text-slate-700">{currentUser.role}</span>
                  <span>IP LOCATION:</span> <span className="font-bold text-slate-700">Silchar Center Network</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-[10px] text-blue-700 max-w-md mx-auto leading-relaxed">
                💡 <strong>Workstation Simulator:</strong> You can simulate administrative authorization bypasses easily! Switch your session context from the Access/Operator Selector in the top bar to view this module.
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView 
                  data={erpData} 
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryView 
                  data={erpData}
                  currentUser={currentUser}
                  onPostInventoryAction={handleInventoryAction}
                  onAddProduct={handleAddProduct}
                  onBulkImport={(items) => handleBulkImport('inventory', items)}
                />
              )}

              {currentTab === 'purchases' && (
                <PurchaseView 
                  data={erpData}
                  currentUser={currentUser}
                  onCreatePO={handleCreatePO}
                  onApprovePO={handleApprovePO}
                  onReceiveGoods={handleReceiveGoods}
                  onBulkImport={(items) => handleBulkImport('purchases', items)}
                />
              )}

              {currentTab === 'sales' && (
                <SalesView 
                  data={erpData}
                  currentUser={currentUser}
                  onCreateInvoice={handleCreateInvoice}
                  onAddCustomer={handleAddCustomer}
                  onBulkImport={(items) => handleBulkImport('sales', items)}
                  onUpdateERPData={saveStateToServer}
                />
              )}

              {currentTab === 'suppliers' && (
                <SupplierView 
                  data={erpData}
                  currentUser={currentUser}
                  onAddSupplier={handleAddSupplier}
                  onReleasePayment={handleReleasePayment}
                  onBulkImport={(items) => handleBulkImport('suppliers', items)}
                />
              )}

              {currentTab === 'customers' && (
                <CustomerView 
                  data={erpData}
                  currentUser={currentUser}
                  onAddCustomer={handleAddCustomer}
                  onAdjustCredit={handleAdjustCredit}
                  onBulkImport={(items) => handleBulkImport('customers', items)}
                />
              )}

              {currentTab === 'finance' && (
                <AccountsView 
                  data={erpData}
                  currentUser={currentUser}
                  onAddFinancialRecord={handleAddFinancialRecord}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView 
                  data={erpData}
                />
              )}

              {currentTab === 'employees' && (
                <EmployeesView 
                  data={erpData}
                  currentUser={currentUser}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onUpdatePermissions={handleUpdatePermissions}
                  onSwitchActiveUser={(user) => setCurrentUser(user)}
                />
              )}

              {currentTab === 'ai-assistant' && (
                <AIAssistantView 
                  data={erpData}
                  currentUser={currentUser}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView 
                  data={erpData}
                  currentUser={currentUser}
                  onTriggerSync={handleTriggerSync}
                  isSyncing={isSyncing}
                  onSaveLogoAndBranding={handleSaveBranding}
                />
              )}
            </>
          )}

        </main>

      </div>

    </div>
  );
}
