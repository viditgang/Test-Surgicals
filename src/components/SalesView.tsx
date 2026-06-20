import React from "react";
import { ERPData, SalesInvoice, Product, Customer, InvoiceItem, User, PaymentReceipt, PurchaseOrder } from "../types";
import { formatINR } from "../utils";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Printer, 
  Search, 
  TrendingUp, 
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
  Layers,
  ShoppingBag,
  RotateCcw,
  Tag,
  Truck,
  Package,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

// MODULAR DETACHED VIEWS
import GSTInvoicePrint from "./GSTInvoicePrint";
import CreditDebitNotesView from "./CreditDebitNotesView";
import SalesOrdersView from "./SalesOrdersView";
import DeliveryChallansView from "./DeliveryChallansView";
import CampaignSchemesView from "./CampaignSchemesView";

interface SalesViewProps {
  data: ERPData;
  currentUser: User;
  onCreateInvoice: (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber'>) => void;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'outstandingPayments' | 'lifetimeValue'>) => void;
  onBulkImport?: (items: any[]) => void;
  onUpdateERPData?: (updated: ERPData) => Promise<void>;
}

export default function SalesView({ 
  data, 
  currentUser, 
  onCreateInvoice, 
  onAddCustomer, 
  onBulkImport,
  onUpdateERPData 
}: SalesViewProps) {
  
  // Tabs: Invoices, Sales Orders, Delivery Challans, Credit Notes, Schemes
  const [activeTab, setActiveTab] = React.useState<'invoices' | 'orders' | 'challans' | 'notes' | 'schemes'>('invoices');

  // Billing drawers and selections
  const [showInvoicingScreen, setShowInvoicingScreen] = React.useState(false);
  const [showImportWidget, setShowImportWidget] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("custom");
  const [selectedCustomerState, setSelectedCustomerState] = React.useState("Assam");
  const [tempCustomerName, setTempCustomerName] = React.useState("");
  const [tempCustomerMobile, setTempCustomerMobile] = React.useState("");
  const [tempCustomerGst, setTempCustomerGst] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('UPI');
  const [merchantUpiId, setMerchantUpiId] = React.useState("divine@upi");
  const [saveToCrm, setSaveToCrm] = React.useState(false);

  // Cart elements
  const [cart, setCart] = React.useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    isPromoGift?: boolean;
    promoNotes?: string;
  }>>([]);

  const [activeProductId, setActiveProductId] = React.useState("");
  const [activeQty, setActiveQty] = React.useState(1);
  const [activePrice, setActivePrice] = React.useState(0);
  const [activeBatch, setActiveBatch] = React.useState("");
  const [discountValue, setDiscountValue] = React.useState(0);

  // Active Invoice preview modal state
  const [viewInvoice, setViewInvoice] = React.useState<SalesInvoice | null>(null);
  
  // Quick success alerts/toasts
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Set active price and auto FEFO batch selection when product changes
  React.useEffect(() => {
    if (activeProductId) {
      const p = data.products.find(prod => prod.id === activeProductId);
      if (p) {
        // Set unitPrice
        setActivePrice(p.unitPrice);

        // FEFO Auto batch detection
        if (p.batches && p.batches.length > 0) {
          // Sort batches by expiry date ascending (oldest first) to implement FEFO
          const sortedBatches = [...p.batches]
            .filter(b => b.currentStock > 0)
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

          if (sortedBatches.length > 0) {
            setActiveBatch(sortedBatches[0].batchNumber);
            showToast(`FEFO Selected Batch: ${sortedBatches[0].batchNumber} (Expires: ${sortedBatches[0].expiryDate})`);
          } else {
            setActiveBatch(p.batchNumber);
          }
        } else {
          setActiveBatch(p.batchNumber || "");
        }
      }
    } else if (data.products.length > 0) {
      setActiveProductId(data.products[0].id);
    }
  }, [activeProductId, data.products]);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    if (id === "custom") {
      setTempCustomerName("");
      setSelectedCustomerState("Assam");
      setTempCustomerMobile("");
      setTempCustomerGst("");
    } else {
      const customer = data.customers.find(c => c.id === id);
      if (customer) {
        setTempCustomerName(customer.name);
        setSelectedCustomerState(customer.state || "Assam");
        setTempCustomerMobile(customer.mobile);
        setTempCustomerGst(customer.gstNumber || "");
      }
    }
  };

  // Core Schemes & Offers Trigger logic checks on cart entry
  const handleAddToCart = () => {
    if (!activeProductId) return;
    const p = data.products.find(prod => prod.id === activeProductId)!;
    
    if (p.currentStock < p.reorderLevel) {
      showToast(`⚠️ Low stock warning for ${p.name}! (Reorder level limit: ${p.reorderLevel})`);
    }

    if (p.currentStock < activeQty) {
      alert(`Physical stock limitation alert! Billing ${activeQty} but only ${p.currentStock} units are in current catalog batches.`);
    }

    // Scheme Checks: flat discount rate
    let finalUnitPrice = activePrice;
    let promoNotes = "";

    // Search active schemes
    const activeSchemes = data.billingSchemes || [];
    
    // Brand flat discount promo match
    const flatScheme = activeSchemes.find(s => s.active && s.type === 'FlatDiscount' && s.brandTarget?.toLowerCase() === p.brand?.toLowerCase());
    if (flatScheme && flatScheme.discountPercentage) {
      const reduction = (activePrice * flatScheme.discountPercentage) / 100;
      finalUnitPrice = activePrice - reduction;
      promoNotes = `Scheme Flat ${flatScheme.discountPercentage}% applied (-₹${reduction.toFixed(2)})`;
      showToast(`Discount applied! Matching Brand Promo for ${p.brand}: ${flatScheme.name}`);
    }

    // Add normal line to cart
    const newItems = [...cart, {
      productId: activeProductId,
      quantity: Number(activeQty),
      unitPrice: finalUnitPrice,
      batchNumber: activeBatch,
      promoNotes: promoNotes || undefined
    }];

    // Scheme Checks: Buy 10 Get 1 Free on identical SKU
    const buyXScheme = activeSchemes.find(s => s.active && s.type === 'BuyXGetY' && s.productIdX === activeProductId);
    if (buyXScheme && buyXScheme.quantityX && buyXScheme.quantityY && buyXScheme.productIdY) {
      if (Number(activeQty) >= buyXScheme.quantityX) {
        // Calculate bonus units
        const factor = Math.floor(Number(activeQty) / buyXScheme.quantityX);
        const rewardQty = factor * buyXScheme.quantityY;
        const rewardProduct = data.products.find(pr => pr.id === buyXScheme.productIdY);

        if (rewardProduct) {
          newItems.push({
            productId: buyXScheme.productIdY,
            quantity: rewardQty,
            unitPrice: 0, // Free of cost
            batchNumber: rewardProduct.batchNumber,
            isPromoGift: true,
            promoNotes: `FREE BONUS STOCK [${buyXScheme.name}]`
          });
          showToast(`Bonus added! Added ${rewardQty} free units of ${rewardProduct.name}`);
        }
      }
    }

    setCart(newItems);
    showToast(`Added ${p.name} to checkout basket.`);
    setActiveQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Submit authorized tax invoice
  const handleAuthorizeInvoice = async () => {
    if (!tempCustomerName.trim()) {
      alert("Please provide the hospital or walk-in client name for GST verification.");
      return;
    }
    if (cart.length === 0) {
      alert("Checkout basket is empty. Please add dental/surgical equipment.");
      return;
    }

    const items: InvoiceItem[] = cart.map(line => {
      const p = data.products.find(prod => prod.id === line.productId)!;
      const sub = line.quantity * line.unitPrice;
      const gstAmount = (sub * p.gstRate) / 100;
      
      const isIntra = selectedCustomerState.toLowerCase().includes("assam");
      return {
        productId: line.productId,
        name: p.name,
        sku: p.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        gstRate: p.gstRate,
        gstAmount,
        cgstAmount: isIntra ? gstAmount / 2 : 0,
        sgstAmount: isIntra ? gstAmount / 2 : 0,
        igstAmount: !isIntra ? gstAmount : 0,
        totalAmount: sub + gstAmount,
        batchNumber: line.batchNumber
      };
    });

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalGst = items.reduce((acc, item) => acc + item.gstAmount, 0);
    const isIntra = selectedCustomerState.toLowerCase().includes("assam");
    
    // Calculate global discount card
    const grandTotal = subtotal + totalGst - Number(discountValue);

    // Create persistent client accounts if requested
    if (selectedCustomerId === "custom" && saveToCrm && onAddCustomer) {
      try {
        await onAddCustomer({
          name: tempCustomerName,
          mobile: tempCustomerMobile || "919435011223",
          email: `${tempCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example-crm.com`,
          address: "Regional Hospital Ward, Assam",
          gstNumber: tempCustomerGst || "",
          creditLimit: 100000,
          state: selectedCustomerState
        });
        showToast(`🎉 Registered ${tempCustomerName} into CRM directory.`);
      } catch (err) {
        console.error("Failed to persist CRM Customer.", err);
      }
    }

    onCreateInvoice({
      customerId: selectedCustomerId === "custom" ? "custom-guest" : selectedCustomerId,
      customerName: tempCustomerName,
      customerMobile: tempCustomerMobile || "919435011223",
      customerGst: tempCustomerGst,
      customerState: selectedCustomerState,
      items,
      subtotal,
      totalGst,
      totalCgst: isIntra ? totalGst / 2 : 0,
      totalSgst: isIntra ? totalGst / 2 : 0,
      totalIgst: !isIntra ? totalGst : 0,
      grandTotal,
      discount: Number(discountValue),
      date: new Date().toISOString(),
      paymentMethod,
      status: 'Paid', // Fully cleared initially
      createdBy: `${currentUser.name} (${currentUser.role})`,
      amountPaid: grandTotal,
      paymentsList: [
        {
          id: `pay-${Date.now()}`,
          amount: grandTotal,
          date: new Date().toISOString().split("T")[0],
          paymentMethod,
          notes: "Initial point of purchase full clearance"
        }
      ]
    });

    // Reset drawer state
    setShowInvoicingScreen(false);
    setCart([]);
    setSelectedCustomerId("custom");
    setTempCustomerName("");
    setTempCustomerMobile("");
    setTempCustomerGst("");
    setDiscountValue(0);
    
    showToast("✅ Real-Time GST-Compliant Bill Released & Stock Batches Updated.");
  };

  // Handler to log payments on live invoices inside GSTInvoicePrint overlay
  const handleLogPaymentReceipt = async (invoiceId: string, payment: Omit<PaymentReceipt, 'id'>) => {
    if (!onUpdateERPData) return;

    const matchedInvoice = data.salesInvoices.find(it => it.id === invoiceId);
    if (!matchedInvoice) return;

    const currentPayments = matchedInvoice.paymentsList || [];
    const newPayment: PaymentReceipt = {
      ...payment,
      id: `pay-receipt-${Date.now()}`
    };

    const newPaymentsList = [...currentPayments, newPayment];
    const newPaidTotal = (matchedInvoice.amountPaid || 0) + payment.amount;
    const isCompleted = newPaidTotal >= matchedInvoice.grandTotal;

    const newInvoice: SalesInvoice = {
      ...matchedInvoice,
      paymentsList: newPaymentsList,
      amountPaid: newPaidTotal,
      status: isCompleted ? 'Paid' : 'Partial'
    };

    // Update Customer outstanding account ledger balance
    const updatedCustomers = data.customers.map(c => {
      if (c.id === matchedInvoice.customerId) {
        return {
          ...c,
          outstandingPayments: Math.max(0, c.outstandingPayments - payment.amount)
        };
      }
      return c;
    });

    const updatedInvoices = data.salesInvoices.map(inv => inv.id === invoiceId ? newInvoice : inv);

    // Save financial record
    const payRecord = {
      id: `fin-pay-${Date.now()}`,
      type: "Income" as const,
      category: "Sales Revenue",
      amount: payment.amount,
      gstImpact: 0,
      date: payment.date,
      description: `Clearing payment receipt for Invoice ${matchedInvoice.invoiceNumber}`
    };

    const finalERP: ERPData = {
      ...data,
      salesInvoices: updatedInvoices,
      customers: updatedCustomers,
      financialRecords: [payRecord, ...data.financialRecords],
      activityLogs: [
        {
          id: `act-receipt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Finance Ledger",
          action: `Cleared ₹${payment.amount.toLocaleString('en-IN')} payment against Invoice ${matchedInvoice.invoiceNumber}`
        },
        ...data.activityLogs
      ]
    };

    await onUpdateERPData(finalERP);
    setViewInvoice(newInvoice); // Refresh layout
    showToast("💰 Finance Outstanding state updated successfully!");
  };

  // ONE-CLICK AUTO PO-DRAFT REORDER TRIGGER (Marg Stock depth)
  const handleOneClickAutoPO = async (prod: Product) => {
    if (!onUpdateERPData) return;

    // Fetch preferred supplier
    const pSupp = data.suppliers.find(s => s.preferred) || data.suppliers[0];
    if (!pSupp) {
      alert("No suppliers found in registry. Please configure at least one Supplier first.");
      return;
    }

    const qtyToOrder = prod.reorderLevel * 2;
    const itemGst = (qtyToOrder * prod.purchasePrice * prod.gstRate) / 100;
    const itemTotal = (qtyToOrder * prod.purchasePrice) + itemGst;

    const code = `PO-AUTO-${Date.now().toString().slice(-4)}`;

    const newDraftPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: code,
      supplierId: pSupp.id,
      supplierName: pSupp.name,
      orderDate: new Date().toISOString().split("T")[0],
      status: 'Draft',
      totalAmount: itemTotal,
      totalGst: itemGst,
      notes: `One-Click Auto-Draft generated for low stock threshold SKU ${prod.sku}`,
      items: [
        {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantity: qtyToOrder,
          purchasePrice: prod.purchasePrice,
          gstRate: prod.gstRate,
          totalGst: itemGst,
          totalAmount: itemTotal
        }
      ]
    };

    const finalERPData: ERPData = {
      ...data,
      purchaseOrders: [newDraftPO, ...data.purchaseOrders],
      activityLogs: [
        {
          id: `act-auto-po-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Auto PO Trigger",
          action: `Initiated draft PO ${code} to ${pSupp.name} for ${qtyToOrder} units of ${prod.sku} (Reorder level check)`
        },
        ...data.activityLogs
      ]
    };

    await onUpdateERPData(finalERPData);
    showToast(`🛒 One-Click Draft Auto-PO ${code} created for reorder stock safety!`);
  };

  return (
    <div className="space-y-6 max-w-full font-sans">
      
      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in no-print">
          <Sparkles size={14} className="text-yellow-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Banner Board */}
      <div className="p-6 bg-linear-to-r from-[#0F4C81] to-[#1D74C1] text-white rounded-2xl shadow-sm relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Active POS billing & Sales register</h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Fulfill emergency medical requisitions, track multi-batch FEFO stocks, manage credit terms, issue delivery challans, and file tax invoices seamlessly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImportWidget(!showImportWidget)}
              className="px-4 py-3 border border-blue-200/50 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-300" />
              <span>Import via Excel</span>
            </button>
            <button 
              onClick={() => setShowInvoicingScreen(true)}
              className="px-5 py-3 bg-white text-[#0F4C81] text-xs font-bold rounded-xl shadow-lg hover:bg-blue-50 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              Launch POS Checkout
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right pointer-events-none"></div>
      </div>

      {showImportWidget && onBulkImport && (
        <ExcelImportWidget 
          type="sales" 
          onImport={(items) => {
            onBulkImport(items);
            setShowImportWidget(false);
          }} 
        />
      )}

      {/* Multi-Tab Navigation Interface Bar */}
      <div className="flex flex-wrap border-b border-slate-100 gap-1.5 no-print uppercase text-[10px] tracking-wider font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 px-4 cursor-pointer flex items-center gap-1.5 ${activeTab === 'invoices' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81]' : 'hover:text-slate-600'}`}
        >
          <ShoppingBag size={14} />
          GST Tax Invoices
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 px-4 cursor-pointer flex items-center gap-1.5 ${activeTab === 'orders' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81]' : 'hover:text-slate-600'}`}
        >
          <Layers size={14} />
          Hospital POs / Sales Orders
        </button>
        <button
          onClick={() => setActiveTab('challans')}
          className={`pb-2.5 px-4 cursor-pointer flex items-center gap-1.5 ${activeTab === 'challans' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81]' : 'hover:text-slate-600'}`}
        >
          <Truck size={14} />
          Delivery Challans (DC)
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-2.5 px-4 cursor-pointer flex items-center gap-1.5 ${activeTab === 'notes' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81]' : 'hover:text-slate-600'}`}
        >
          <RotateCcw size={14} />
          Credit & Debit Notes
        </button>
        <button
          onClick={() => setActiveTab('schemes')}
          className={`pb-2.5 px-4 cursor-pointer flex items-center gap-1.5 ${activeTab === 'schemes' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81]' : 'hover:text-slate-600'}`}
        >
          <Tag size={14} />
          Promo Schemes & Offers
        </button>
      </div>

      {/* RENDER ACTIVE TAB CORES */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          
          {/* Low Stock Auto-PO panel */}
          <div className="bg-amber-50/50 border border-amber-250 p-4 rounded-xl flex items-center justify-between gap-4 py-3 text-xs leading-normal font-sans">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} className="text-amber-500 shrink-0" />
              <div>
                <span className="font-bold block text-amber-900 leading-none mb-0.5">Automated Low Stock Safety Alerts</span>
                <span className="text-[10px] text-amber-700">Triggered: {data.products.filter(p => p.currentStock <= p.reorderLevel).length} catalogs below reorder point limit.</span>
              </div>
            </div>
            {data.products.some(p => p.currentStock <= p.reorderLevel) && (
              <button
                onClick={() => {
                  const itemsLeft = data.products.filter(p => p.currentStock <= p.reorderLevel);
                  itemsLeft.forEach(prod => handleOneClickAutoPO(prod));
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer transition uppercase text-[9px]"
              >
                1-Click PO triggers to Preferred suppliers
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden no-print">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Completed GST Sales Register</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Live outstanding and receivables compliance ledger tracker.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-medium text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-150">
                    <th className="py-3.5 px-4">Invoice ID</th>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4 text-center">Fulfillment Date</th>
                    <th className="py-3.5 px-4 text-center">Tax Split Status</th>
                    <th className="py-3.5 px-4 text-right">Cleared Amount</th>
                    <th className="py-3.5 px-4 text-right">Remaining Due</th>
                    <th className="py-3.5 px-4 text-right">Grand Invoice Net</th>
                    <th className="py-3.5 px-4 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {data.salesInvoices.map((inv) => {
                    const subtotalPaid = inv.amountPaid || 0;
                    const dueAmount = Math.max(0, inv.grandTotal - subtotalPaid);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/40 transition">
                        <td className="py-3.5 px-4 font-bold text-[#0F4C81] font-mono">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{inv.customerName}</p>
                          <span className="text-[9px] text-slate-400 font-mono">GST: {inv.customerGst || 'Walk-In'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                            inv.customerState?.toLowerCase().includes("assam") ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                          }`}>
                            {inv.customerState?.toLowerCase().includes("assam") ? "CGST + SGST (Intra)" : "IGST Only (Inter)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatINR(subtotalPaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-500">
                          {formatINR(dueAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#0F4C81] font-mono">
                          {formatINR(inv.grandTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 select-none text-[9px] font-bold">
                            <button
                              onClick={() => setViewInvoice(inv)}
                              className="px-2 py-1 bg-slate-50 border hover:bg-slate-100 text-slate-700 rounded cursor-pointer transition flex items-center gap-1"
                            >
                              <FileText size={10} />
                              Open Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && onUpdateERPData && (
        <SalesOrdersView data={data} onSaveERPData={onUpdateERPData} currentUser={currentUser} />
      )}

      {activeTab === 'challans' && onUpdateERPData && (
        <DeliveryChallansView data={data} onSaveERPData={onUpdateERPData} currentUser={currentUser} />
      )}

      {activeTab === 'notes' && onUpdateERPData && (
        <CreditDebitNotesView data={data} onSaveERPData={onUpdateERPData} currentUser={currentUser} />
      )}

      {activeTab === 'schemes' && onUpdateERPData && (
        <CampaignSchemesView data={data} onSaveERPData={onUpdateERPData} currentUser={currentUser} />
      )}

      {/* POS RETAIL BILLING LAUNCHER DRAWERS */}
      {showInvoicingScreen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto font-sans my-8">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#0F4C81]">Quick Retail POS Billing Terminal</h3>
              <button onClick={() => setShowInvoicingScreen(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              
              {/* Left Column: Client selectors */}
              <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-4 border-r lg:border-slate-150">
                
                <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-[#0F4C81] uppercase block tracking-wider leading-none">Customer Segment</span>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full bg-white border rounded p-1.5 text-xs font-bold"
                  >
                    <option value="custom">✍️ Walk-In Hospital / Patient details</option>
                    {data.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Hospital Name</span>
                      <input
                        type="text"
                        value={tempCustomerName}
                        onChange={(e) => setTempCustomerName(e.target.value)}
                        placeholder="Red Cross Silchar"
                        className="w-full border rounded p-1 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Supply State</span>
                      <select
                        value={selectedCustomerState}
                        onChange={(e) => setSelectedCustomerState(e.target.value)}
                        className="w-full bg-white border rounded p-1 text-xs"
                      >
                        <option value="Assam (State Node 18)">Assam (Intra-State Split)</option>
                        <option value="Meghalaya (State Node 17)">Meghalaya (Inter-State IGST)</option>
                        <option value="Delhi (State Node 07)">Delhi (Inter-State IGST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block mb-0.5">WhatsApp Contact</span>
                      <input
                        type="text"
                        value={tempCustomerMobile}
                        onChange={(e) => setTempCustomerMobile(e.target.value)}
                        placeholder="9435011993"
                        className="w-full border rounded p-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Client GSTIN</span>
                      <input
                        type="text"
                        value={tempCustomerGst}
                        onChange={(e) => setTempCustomerGst(e.target.value)}
                        placeholder="18AABCS9192D1Z0"
                        className="w-full border rounded p-1 text-xs uppercase"
                      />
                    </div>
                  </div>

                  {selectedCustomerId === "custom" && (
                    <label className="flex items-center gap-1.5 text-[9px] text-slate-600 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveToCrm}
                        onChange={(e) => setSaveToCrm(e.target.checked)}
                        className="rounded border-slate-300 text-[#0F4C81]"
                      />
                      Save to Persistent CRM customers index
                    </label>
                  )}
                </div>

                {/* SKU configuration panel with FEFO batch listings */}
                <div className="bg-slate-50 p-4 border rounded-xl space-y-3 font-sans">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider leading-none">Load Catalog SKU</span>
                  
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Product</span>
                    <select
                      value={activeProductId}
                      onChange={(e) => setActiveProductId(e.target.value)}
                      className="w-full bg-white border rounded p-1.5 text-xs font-bold"
                    >
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} [Stk: {p.currentStock}]</option>
                      ))}
                    </select>
                  </div>

                  {/* Active Product Batch Picker (FEFO order display) */}
                  <div className="grid grid-cols-1 gap-2 text-xs font-medium bg-white p-2.5 border rounded">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Surgical Batch (FEFO Auto Match)</span>
                      <select
                        value={activeBatch}
                        onChange={(e) => setActiveBatch(e.target.value)}
                        className="w-full bg-slate-50 border p-1 rounded text-xs leading-none font-bold"
                      >
                        {data.products.find(pr => pr.id === activeProductId)?.batches?.map(b => (
                          <option key={b.id} value={b.batchNumber}>
                            Batch {b.batchNumber} (Expires: {b.expiryDate}) [Qty: {b.currentStock}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block">Rate (Excl. Tax)</span>
                      <input
                        type="number"
                        value={activePrice}
                        onChange={(e) => setActivePrice(Number(e.target.value))}
                        className="w-full border rounded p-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block">Billing Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={activeQty}
                        onChange={(e) => setActiveQty(Number(e.target.value))}
                        className="w-full border rounded p-1 text-xs font-bold animate-pulse"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer flex items-center justify-center gap-1 shadow"
                  >
                    <Plus size={14} />
                    Append line item to Basket
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Trade discount code reduction (₹)</span>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full border rounded p-2 text-xs font-extrabold text-rose-500 font-mono"
                  />
                </div>

              </div>

              {/* Right Column: cart list */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                
                <div className="border rounded-xl bg-white overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b text-xs font-extrabold text-slate-700 flex justify-between items-center leading-none">
                    <span>Retail Checkout basket lines</span>
                    <span className="text-[9px] bg-[#0F4C81] text-white px-2 py-0.5 rounded-full">{cart.length} lines</span>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 font-medium">
                    {cart.map((line, idx) => {
                      const p = data.products.find(prod => prod.id === line.productId)!;
                      const lineBase = line.quantity * line.unitPrice;
                      const lineGst = (lineBase * p.gstRate) / 100;
                      return (
                        <div key={idx} className="p-3.5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                              SKU: {p.sku} | Batch: {line.batchNumber} | Rate: ₹{line.unitPrice.toLocaleString('en-IN')} | Tax: {p.gstRate}%
                            </p>
                            {line.promoNotes && (
                              <span className="inline-block mt-0.5 text-[8px] bg-yellow-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                                {line.promoNotes}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-extrabold text-[#0F4C81] font-mono">{formatINR(lineBase + lineGst)}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{line.quantity} Units</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3.5 text-xs font-bold text-slate-700">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-brand block leading-none mb-1">POS Payment Channel</span>
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        className="w-full bg-white border p-1 rounded font-bold"
                      >
                        <option value="UPI">Instants UPI pay QR</option>
                        <option value="Cash">Cash drawer settlement</option>
                        <option value="Bank Transfer">NEFT Bank Transfer</option>
                        <option value="Card">HDFC Swipe credit card</option>
                      </select>
                    </div>

                    <div className="text-right flex flex-col justify-center">
                      <span className="text-[8px] text-slate-400 uppercase font-black leading-none mb-0.5">Grand invoice sum (incl taxes)</span>
                      <p className="text-xl font-black text-[#0F4C81] font-mono mt-1">
                        {formatINR(cart.reduce((acc, line) => {
                          const p = data.products.find(prod => prod.id === line.productId)!;
                          const base = line.quantity * line.unitPrice;
                          return acc + base + (base * p.gstRate / 100);
                        }, 0) - Number(discountValue))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t font-bold text-xs uppercase cursor-pointer">
                  <button onClick={() => setShowInvoicingScreen(false)} className="px-4 py-2 bg-slate-50 border rounded text-slate-400">
                    Cancel
                  </button>
                  <button onClick={handleAuthorizeInvoice} className="px-5 py-2.5 bg-[#0F4C81] text-white rounded shadow flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    Release Sales Bill
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* RENDER GST COMPLIANT PRINT INVOICE MODAL OVERLAY */}
      {viewInvoice && (
        <GSTInvoicePrint 
          invoice={viewInvoice} 
          onClose={() => setViewInvoice(null)} 
          onLogPayment={handleLogPaymentReceipt}
          merchantUpiId={merchantUpiId}
        />
      )}

    </div>
  );
}
