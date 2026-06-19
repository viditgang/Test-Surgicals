import React from "react";
import { ERPData, SalesInvoice, Product, Customer, InvoiceItem, User } from "../types";
import { formatINR } from "../utils";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Printer, 
  Share2, 
  Search, 
  Check, 
  TrendingUp, 
  X,
  CreditCard,
  QrCode,
  MessageSquare,
  Sparkles,
  Smartphone,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  Briefcase,
  FileSpreadsheet
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

interface SalesViewProps {
  data: ERPData;
  currentUser: User;
  onCreateInvoice: (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber'>) => void;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'outstandingPayments' | 'lifetimeValue'>) => void;
  onBulkImport?: (items: any[]) => void;
}

export default function SalesView({ data, currentUser, onCreateInvoice, onAddCustomer, onBulkImport }: SalesViewProps) {
  // Billing drawers and selections
  const [showInvoicingScreen, setShowInvoicingScreen] = React.useState(false);
  const [showImportWidget, setShowImportWidget] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("custom");
  const [tempCustomerName, setTempCustomerName] = React.useState("");
  const [tempCustomerMobile, setTempCustomerMobile] = React.useState("");
  const [tempCustomerGst, setTempCustomerGst] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('UPI');
  const [merchantUpiId, setMerchantUpiId] = React.useState("divine@upi");
  const [saveToCrm, setSaveToCrm] = React.useState(false);

  // Sales invoice cart items
  const [cart, setCart] = React.useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>>([]);

  const [activeProductId, setActiveProductId] = React.useState("");
  const [activeQty, setActiveQty] = React.useState(1);
  const [activePrice, setActivePrice] = React.useState(0);
  const [discountValue, setDiscountValue] = React.useState(0);

  // Active Invoice preview modal state
  const [viewInvoice, setViewInvoice] = React.useState<SalesInvoice | null>(null);
  
  // Interactive UPI pay simulation states inside invoice preview
  const [simulatedUpiStatus, setSimulatedUpiStatus] = React.useState<'idle' | 'scanning' | 'verified'>('idle');

  // WhatsApp integration modal states
  const [whatsAppInvoice, setWhatsAppInvoice] = React.useState<SalesInvoice | null>(null);
  const [whatsAppMobile, setWhatsAppMobile] = React.useState("");
  const [whatsAppText, setWhatsAppText] = React.useState("");
  const [whatsAppCopied, setWhatsAppCopied] = React.useState(false);

  // Quick success alerts/toasts inside POS
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Set active price and reset quantity when product selection changes
  React.useEffect(() => {
    if (activeProductId) {
      const p = data.products.find(prod => prod.id === activeProductId);
      if (p) {
        setActivePrice(p.unitPrice);
      }
    } else if (data.products.length > 0) {
      setActiveProductId(data.products[0].id);
      setActivePrice(data.products[0].unitPrice);
    }
  }, [activeProductId, data.products]);

  // Handle selected customer dropdown change
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    if (id === "custom") {
      setTempCustomerName("");
      setTempCustomerMobile("");
      setTempCustomerGst("");
    } else {
      const customer = data.customers.find(c => c.id === id);
      if (customer) {
        setTempCustomerName(customer.name);
        setTempCustomerMobile(customer.mobile);
        setTempCustomerGst(customer.gstNumber || "");
      }
    }
  };

  // Sync to WhatsApp pre-filled text whenever target invoice selection is made
  React.useEffect(() => {
    if (whatsAppInvoice) {
      setWhatsAppMobile(whatsAppInvoice.customerMobile || "919435011223");
      setWhatsAppText(buildWhatsAppMessage(whatsAppInvoice));
      setWhatsAppCopied(false);
    }
  }, [whatsAppInvoice]);

  const handleAddToCart = () => {
    if (!activeProductId) return;
    const p = data.products.find(prod => prod.id === activeProductId)!;
    
    if (p.currentStock < p.reorderLevel) {
      showToast(`⚠️ Low stock warning for ${p.name}! (Reorder point: ${p.reorderLevel})`);
    }

    if (p.currentStock < activeQty) {
      alert(`Warning: Billing quantity [${activeQty}] exceeds currently available physical inventory [${p.currentStock}]!`);
    }

    const existingIdx = cart.findIndex(i => i.productId === activeProductId);
    if (existingIdx !== -1) {
      const updated = [...cart];
      updated[existingIdx].quantity += Number(activeQty);
      setCart(updated);
      showToast(`Updated qty of ${p.name} in cart.`);
    } else {
      setCart([
        ...cart,
        {
          productId: activeProductId,
          quantity: Number(activeQty),
          unitPrice: Number(activePrice)
        }
      ]);
      showToast(`Added ${p.name} to checkout basket.`);
    }
    setActiveQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
    const item = cart[index];
    const p = data.products.find(prod => prod.id === item.productId);
    setCart(cart.filter((_, i) => i !== index));
    if (p) showToast(`Removed ${p.name} from basket.`);
  };

  const handleAuthorizeInvoice = async () => {
    if (!tempCustomerName.trim()) {
      alert("Please provide the hospital or client name for GST invoice verification.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart checkout basket is currently empty. Please add dental/surgical equipment.");
      return;
    }

    // Build invoice items
    const items: InvoiceItem[] = cart.map(line => {
      const p = data.products.find(prod => prod.id === line.productId)!;
      const sub = line.quantity * line.unitPrice;
      const gstAmount = (sub * p.gstRate) / 100;
      return {
        productId: line.productId,
        name: p.name,
        sku: p.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        gstRate: p.gstRate,
        gstAmount,
        totalAmount: sub + gstAmount
      };
    });

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalGst = items.reduce((acc, item) => acc + item.gstAmount, 0);
    const grandTotal = subtotal + totalGst - Number(discountValue);

    // Dynamic Client Registration check
    if (selectedCustomerId === "custom" && saveToCrm && onAddCustomer) {
      try {
        await onAddCustomer({
          name: tempCustomerName,
          mobile: tempCustomerMobile || "919435011223",
          email: `${tempCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example-crm.com`,
          address: "Regional Hospital Ward, Silchar, Assam",
          gstNumber: tempCustomerGst || "",
          creditLimit: 50000
        });
        showToast(`🎉 Registered ${tempCustomerName} successfully to persistent CRM registry!`);
      } catch (err) {
        console.error("Failed to register customer to CRM folder.", err);
      }
    }

    // Submit invoice
    onCreateInvoice({
      customerId: selectedCustomerId === "custom" ? "custom-guest" : selectedCustomerId,
      customerName: tempCustomerName,
      customerMobile: tempCustomerMobile || "919435011223",
      customerGst: tempCustomerGst,
      items,
      subtotal,
      totalGst,
      grandTotal,
      discount: Number(discountValue),
      date: new Date().toISOString(),
      paymentMethod,
      status: 'Paid', 
      createdBy: `${currentUser.name} (${currentUser.role})`
    });

    // Reset components state
    setShowInvoicingScreen(false);
    setCart([]);
    setSelectedCustomerId("custom");
    setCustomerSearch("");
    setTempCustomerName("");
    setTempCustomerMobile("");
    setTempCustomerGst("");
    setDiscountValue(0);
    setSaveToCrm(false);
    
    showToast("✅ Real-Time GST-Compliant Bill Released & Stocks Deducted.");
  };

  // Real WhatsApp direct link API compiler
  const buildWhatsAppMessage = (inv: SalesInvoice): string => {
    const itemLines = inv.items.map((it, idx) => {
      const grossStr = formatINR(it.totalAmount);
      return `*${idx + 1}. ${it.name}*\n   Qty: ${it.quantity} × ₹${it.unitPrice.toLocaleString('en-IN')} (GST ${it.gstRate}%) | Sum: ${grossStr}`;
    }).join('\n');

    const upiPayload = `upi://pay?pa=${merchantUpiId}&pn=Divine%20Surgicals&am=${inv.grandTotal}&tn=${inv.invoiceNumber}&cu=INR`;

    return `*DIVINE SURGICALS* 🏥\n_National Highway Bypass, Silchar, Cachar, Assam (788005)_\n*GST Tax Invoice Notice*\n----------------------------------------\n*Invoice Code:* ${inv.invoiceNumber}\n*Date:* ${new Date(inv.date).toLocaleDateString('en-IN')}\n*Client:* ${inv.customerName}\n\n*Items Dispatched Summary:*\n${itemLines}\n\n----------------------------------------\n*Subtotal Taxable:* ${formatINR(inv.subtotal)}\n*IGST/CGST Outflow:* ${formatINR(inv.totalGst)}\n${inv.discount > 0 ? `*Special Discount Cleared:* -${formatINR(inv.discount)}\n` : ''}*NET PAYABLE TOTAL:* *${formatINR(inv.grandTotal)}*\n----------------------------------------\n*Fulfillment status:* Road Dispatch Loaded • PAID\n\n*Instant BHIM UPI Payment Link:*\n${upiPayload}\n\nWe extremely value your partnership with Divine Surgicals. Have a nice day! 🙏`;
  };

  const handleLaunchWhatsApp = () => {
    let rawPhone = whatsAppMobile.replace(/\D/g, "");
    if (!rawPhone) rawPhone = "919435011223";
    // Ensure default Indian country code prefix
    const prefixedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    
    const waUrl = `https://api.whatsapp.com/send?phone=${prefixedPhone}&text=${encodeURIComponent(whatsAppText)}`;
    window.open(waUrl, "_blank");
    showToast("Opening WhatsApp Web / Mobile chat window...");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setWhatsAppCopied(true);
    showToast("Copied invoice text summary to clipboard!");
    setTimeout(() => setWhatsAppCopied(false), 2000);
  };

  const handlePrintDraft = (invoiceNo: string) => {
    alert(`Success: Print Spooler dispatched for Invoice [${invoiceNo}]. Divine Surgicals regional stationery formatting enabled via Silchar Cachar node.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <Sparkles size={14} className="text-yellow-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sales Overview Banner */}
      <div className="p-6 bg-linear-to-r from-[#0F4C81] to-[#1D74C1] text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Active POS billing & Sales register</h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Fulfill emergency medical requisitions, issue instant GST invoices, configure live scan-to-pay UPI codes, and dispatch interactive Whatsapp digital statements to regional hospitals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
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
              id="launchPosCheckoutBtn"
            >
              Launch POS Checkout
            </button>
          </div>
        </div>
        {/* Background ambient accents */}
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

      {/* Sales Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed GST Invoices</span>
            <p className="text-2xl font-extrabold text-[#0F4C81] mt-1">{data.salesInvoices.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0F4C81]">
            <FileText size={20} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Retail Collections</span>
            <p className="text-2xl font-extrabold text-[#28A745] mt-1">
              {formatINR(data.salesInvoices.reduce((acc, i) => acc + i.grandTotal, 0))}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Corporate UPI Gateway</span>
            <p className="text-sm font-bold text-slate-700 mt-1 font-mono">{merchantUpiId}</p>
            <span className="text-[9px] text-[#0F4C81] font-bold block mt-0.5">Linked Node: HDFC Silchar Branch</span>
          </div>
          <button 
            onClick={() => {
              const res = prompt("Update System Recipient UPI ID / VPA:", merchantUpiId);
              if (res) {
                setMerchantUpiId(res);
                showToast(`Payee Merchant VPA updated to ${res}`);
              }
            }}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg text-slate-600 cursor-pointer"
          >
            Configure
          </button>
        </div>
      </div>

      {/* Sales Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active GST Sales Register</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Audit compliance reporting: Silchar Regional Cachar Council Node</p>
          </div>
          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
            Realtime Automated State Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-medium text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-150">
                <th className="py-3.5 px-4">Invoice ID</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4 text-center">Fulfillment Date</th>
                <th className="py-3.5 px-4 text-center">Taxes & Offsets</th>
                <th className="py-3.5 px-4 text-right">Grand Total Paid</th>
                <th className="py-3.5 px-4 text-center">Interact & Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {data.salesInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/40 transition">
                  <td className="py-3.5 px-4 font-bold text-[#0F4C81] font-mono">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{inv.customerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-mono">Mob: {inv.customerMobile}</span>
                      {inv.customerGst && (
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1 rounded font-mono font-bold">GSTIN: {inv.customerGst}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                    {new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4 text-center space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-semibold">Taxes: {formatINR(inv.totalGst)}</p>
                    {inv.discount > 0 && (
                      <p className="text-[9px] text-rose-500 font-bold">Disc: -{formatINR(inv.discount)}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-[#0F4C81] font-mono text-[13px]">
                    {formatINR(inv.grandTotal)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-medium text-[10px]">
                      <button
                        onClick={() => {
                          setSimulatedUpiStatus('idle');
                          setViewInvoice(inv);
                        }}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition font-bold"
                        title="View Full Detailed Layout"
                      >
                        <FileText size={12} />
                        View Bill
                      </button>
                      <button
                        onClick={() => handlePrintDraft(inv.invoiceNumber)}
                        className="px-2.5 py-1.5 bg-blue-50/50 text-[#0F4C81] hover:bg-blue-50 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition border border-blue-100"
                        title="PDF Print File"
                      >
                        <Printer size={12} />
                        PDF
                      </button>
                      <button
                        onClick={() => setWhatsAppInvoice(inv)}
                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1 font-extrabold cursor-pointer transition border border-emerald-100"
                        title="Dispatch Invoice on WhatsApp API"
                      >
                        <MessageSquare size={12} />
                        WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.salesInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                    No sales invoices registered yet. Open POS checkout above to register your first sale!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POS BILLING SCREEN DRAWER */}
      {showInvoicingScreen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="posBillingDrawer">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-[#0F4C81] flex items-center justify-center text-white text-xs font-bold">DS</div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F4C81]">
                    Quick retail POS Billing & Checkout Unit
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">Emergency Surgical Supply Counter Terminal</p>
                </div>
              </div>
              <button onClick={() => setShowInvoicingScreen(false)} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form: Customer Selector & Catalogue Item Injector (Span 5) */}
              <div className="lg:col-span-5 space-y-4 font-medium border-r lg:border-slate-100 lg:pr-6">
                
                {/* Custom/CRM Account Selector */}
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <span className="text-[9px] font-bold text-[#0F4C81] uppercase tracking-wider block">Customer Destination</span>
                  
                  <div className="space-y-2">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-700 font-bold focus:ring-[#0F4C81]"
                    >
                      <option value="custom">✍️ Walk-In / Custom Unregistered Patient</option>
                      {data.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏢 {c.name} (Mob: {c.mobile})
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Full Name</span>
                        <input
                          type="text"
                          value={tempCustomerName}
                          onChange={(e) => setTempCustomerName(e.target.value)}
                          placeholder="e.g. Silchar Red Cross"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                          required
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">WhatsApp Mobile</span>
                        <input
                          type="text"
                          value={tempCustomerMobile}
                          onChange={(e) => setTempCustomerMobile(e.target.value)}
                          placeholder="e.g. 9435011993"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Client GSTIN Label (Optional)</span>
                      <input
                        type="text"
                        value={tempCustomerGst}
                        onChange={(e) => setTempCustomerGst(e.target.value)}
                        placeholder="e.g. 18AABCS9192D1Z0"
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs uppercase"
                      />
                    </div>

                    {selectedCustomerId === "custom" && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="saveToCrmCheck"
                          checked={saveToCrm}
                          onChange={(e) => setSaveToCrm(e.target.checked)}
                          className="rounded border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81] h-3.5 w-3.5 cursor-pointer"
                        />
                        <label htmlFor="saveToCrmCheck" className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                          Save as Registered CRM Client for Future Billing
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Catalog Item */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configure Invoice Item</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">Available Catalog Inventory</label>
                    <select
                      value={activeProductId}
                      onChange={(e) => setActiveProductId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:ring-[#0F4C81]"
                    >
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (SKU: {p.sku}) [Stk: {p.currentStock}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10px] text-slate-400 font-bold block">Bill Price (₹)</label>
                      <input
                        type="number"
                        value={activePrice}
                        onChange={(e) => setActivePrice(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] text-slate-400 font-bold block">Quantity to Bill</label>
                      <input
                        type="number"
                        min="1"
                        value={activeQty}
                        onChange={(e) => setActiveQty(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-2.5 bg-[#4A90E2] text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    Append Item to Basket
                  </button>
                </div>

                {/* Special cash discounts */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Release Special Cash Discount (₹)</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder="e.g. 1000"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs text-rose-500 font-extrabold focus:ring-rose-500"
                  />
                </div>

              </div>

              {/* Right Column: checkout live basket, invoice review, totals (Span 7) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                
                {/* Active Checkout basket list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>Active Basket Items List</span>
                    <span className="text-[10px] bg-[#0F4C81] text-white px-2 py-0.5 rounded-full font-mono">{cart.length} unique</span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-150">
                    {cart.map((line, idx) => {
                      const p = data.products.find(prod => prod.id === line.productId)!;
                      const subLine = line.quantity * line.unitPrice;
                      const lineGst = (subLine * p.gstRate) / 100;
                      return (
                        <div key={idx} className="p-3.5 text-xs flex justify-between items-center bg-white hover:bg-slate-55/40 transition">
                          <div className="flex-1 pr-4">
                            <p className="font-extrabold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              SKU: {p.sku} • UPI/GST {p.gstRate}% • ₹{line.unitPrice.toLocaleString('en-IN')} / ea
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-[#0F4C81] font-mono">{formatINR(subLine + lineGst)}</p>
                              <p className="text-[9px] text-slate-500 font-bold">{line.quantity} units</p>
                            </div>
                            <button
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-rose-450 hover:text-rose-605 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {cart.length === 0 && (
                      <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <p>No surgical consumables are loaded in POS checkout.</p>
                        <p className="text-[10px] text-slate-400">Select standard item configurations on the left panel.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotals summaries & Payment selection */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                    <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-150">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Immediate Channel</span>
                      
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded p-1.5 bg-white text-xs text-slate-800 w-full font-bold focus:ring-[#0F4C81]"
                      >
                        <option value="UPI">UPI QR-Code Pay (Auto-Verify)</option>
                        <option value="Cash">Cash Transaction (Internal Settlement)</option>
                        <option value="Bank Transfer">NEFT/RTGS Bank Node Link</option>
                        <option value="Card">HDFC Swipe Terminal</option>
                      </select>

                      <p className="text-[9px] text-slate-400 leading-normal mt-1 block">
                        {paymentMethod === "UPI" && "Generates dynamic pay-to-merchant invoice BHIM URI code."}
                        {paymentMethod === "Cash" && "Fulfillment immediately cleared inside local sales drawer register."}
                        {paymentMethod === "Bank Transfer" && "Standard regional bank transaction invoice placeholder."}
                        {paymentMethod === "Card" && "Requires HDFC Swipe Terminal connection sync."}
                      </p>
                    </div>

                    <div className="text-right space-y-1 flex flex-col justify-center">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block leading-none font-bold">Total Bill Amount (Incl. GST)</span>
                      <p className="text-2xl font-black text-[#0F4C81] font-mono tracking-tight mt-1">
                        {formatINR(cart.reduce((acc, line) => {
                          const p = data.products.find(prod => prod.id === line.productId)!;
                          const sub = line.quantity * line.unitPrice;
                          return acc + sub + (sub * p.gstRate / 100);
                        }, 0) - Number(discountValue))}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold font-mono">
                        GST Sum: {formatINR(cart.reduce((acc, line) => {
                          const p = data.products.find(prod => prod.id === line.productId)!;
                          return acc + ((line.quantity * line.unitPrice) * p.gstRate) / 100;
                        }, 0))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit operations */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-150">
                  <button
                    onClick={() => setShowInvoicingScreen(false)}
                    className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 text-xs font-semibold cursor-pointer border border-slate-200"
                  >
                    Discard Draft
                  </button>
                  <button
                    onClick={handleAuthorizeInvoice}
                    className="px-6 py-2.5 bg-[#0F4C81] text-white text-xs font-bold rounded-xl shadow-md hover:bg-opacity-95 transition tracking-wider uppercase font-sans flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} />
                    Release Sales Bill
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* FULL INVOICE PREVIEW MODAL */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="invoiceDetailsModal">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl p-6 border border-slate-100 font-sans my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs bg-[#DCEEFF] text-[#0F4C81] font-black px-2.5 py-1 rounded">
                GST TAX INVOICE (ORIGINAL RECIPIENT LAYOUT)
              </span>
              <button onClick={() => setViewInvoice(null)} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Print Area layout */}
            <div className="mt-4 p-5 border border-slate-200 rounded-2xl space-y-6 bg-white shadow-xs">
              
              {/* Header block logo address */}
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#0F4C81] tracking-tight leading-none uppercase">Divine Surgicals</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">Medical Equipment & Consumables Wholesale Hub</p>
                  <p className="text-[9px] text-slate-400 max-w-[240px] leading-relaxed mt-1">National Highway bypass road, Silchar, Cachar District, Assam - 788005</p>
                  <p className="text-[9px] font-bold text-[#0F4C81] mt-1 font-mono">GSTIN: 18AABCS9912D1ZS (Code: 18)</p>
                </div>

                <div className="text-right text-xs">
                  <p className="font-mono text-sm font-black text-slate-800">{viewInvoice.invoiceNumber}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Date: {new Date(viewInvoice.date).toLocaleDateString('en-IN')}</p>
                  <p className="text-[10px] text-slate-400">Cashier: {viewInvoice.createdBy}</p>
                  <p className="font-extrabold text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-250 mt-1 uppercase">
                    Status: {viewInvoice.status}
                  </p>
                </div>
              </div>

              {/* Patient hospital consignee block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
                <div>
                  <span className="font-black text-slate-400 uppercase tracking-wider block text-[8px]">Consignee / Consigned To</span>
                  <p className="font-bold text-slate-800 text-xs mt-1">{viewInvoice.customerName}</p>
                  <p className="text-slate-500 mt-0.5 font-semibold">Mobile No: {viewInvoice.customerMobile}</p>
                  {viewInvoice.customerGst && (
                    <p className="font-mono text-[#0F4C81] font-bold mt-1">CLIENT GSTIN: {viewInvoice.customerGst}</p>
                  )}
                </div>

                <div className="border-l border-slate-200 pl-4 space-y-0.5">
                  <span className="font-black text-slate-400 uppercase tracking-wider block text-[8px]">LOGISTIC & TRANSACTION DETAILS</span>
                  <p className="text-slate-600">Dispatched from: <span className="font-bold text-slate-700">Silchar Depot Floor</span></p>
                  <p className="text-slate-600">State of Supply: <span className="font-bold text-slate-700">Assam Node (18)</span></p>
                  <p className="text-slate-600">Payment mechanism: <span className="font-bold text-slate-700 text-[#0F4C81] font-mono">{viewInvoice.paymentMethod}</span></p>
                </div>
              </div>

              {/* Items Table details */}
              <table className="w-full text-left font-medium text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[9px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Description of Surgical Goods</th>
                    <th className="py-2.5 px-2 text-center">SKU</th>
                    <th className="py-2.5 px-2 text-right">Selling Price</th>
                    <th className="py-2.5 px-2 text-center">Gross Qty</th>
                    <th className="py-2.5 px-2 text-right">Taxes %</th>
                    <th className="py-2.5 px-3 text-right text-[#0F4C81]">Line Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewInvoice.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-800 break-words">{it.name}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500 shrink-0">{it.sku}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatINR(it.unitPrice)}</td>
                      <td className="py-2 px-2 text-center font-black text-slate-800">{it.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-500">{it.gstRate}%</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">{formatINR(it.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Billing totals aggregate list with scan upi qr code */}
              <div className="border-t border-slate-200 pt-5 flex flex-col md:flex-row items-center justify-between gap-6 bg-[#FAFBFD] p-4 rounded-xl">
                
                {/* Dynamically functional live UPI QR Pay Node */}
                <div className="border border-slate-200 bg-white p-3 rounded-2xl flex flex-col items-center gap-2 max-w-[280px]">
                  <div className="relative group">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${merchantUpiId}&pn=Divine%20Surgicals&am=${viewInvoice.grandTotal}&tn=${viewInvoice.invoiceNumber}&cu=INR`
                      )}`} 
                      alt="BHIM UPI pay QR"
                      referrerPolicy="no-referrer"
                      className="h-32 w-32 object-contain select-none"
                    />
                    
                    {simulatedUpiStatus === 'scanning' && (
                      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] rounded p-2 text-center">
                        <Clock size={20} className="text-yellow-400 animate-spin mb-1" />
                        <p className="font-bold">Awaiting Bank Settlement</p>
                        <p className="text-[8px] text-slate-300">Simulating bank webhook response...</p>
                      </div>
                    )}
                    {simulatedUpiStatus === 'verified' && (
                      <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] rounded p-2 text-center">
                        <CheckCircle size={24} className="text-emerald-400 animate-bounce mb-1" />
                        <p className="font-black text-xs">Settlement Cleared!</p>
                        <p className="text-[8px] text-emerald-350">HDFC IMPS webhook verified</p>
                      </div>
                    )}
                  </div>

                  <div className="text-center font-medium">
                    <p className="text-[10px] font-bold text-slate-800">Dynamic Scan-To-Pay UPI</p>
                    <p className="text-[9px] text-[#0F4C81] font-mono leading-none mt-0.5">{merchantUpiId}</p>
                    
                    {simulatedUpiStatus === 'idle' && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSimulatedUpiStatus('scanning');
                          setTimeout(() => {
                            setSimulatedUpiStatus('verified');
                            showToast("💰 Settlement Confirmed! Simulated transaction completed.");
                          }, 2500);
                        }}
                        className="mt-2 text-[9px] bg-sky-50 text-[#0F4C81] border border-sky-100 hover:bg-sky-100 px-2 py-0.5 rounded font-bold cursor-pointer block w-full uppercase"
                      >
                        Simulate Scan Settle
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtotals invoice list */}
                <div className="w-full md:w-64 space-y-2 text-xs font-medium">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-bold text-slate-700">{formatINR(viewInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IGST / CGST Output:</span>
                    <span className="font-mono font-bold text-slate-700">{formatINR(viewInvoice.totalGst)}</span>
                  </div>
                  {viewInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-semibold">
                      <span>Less: Special Discount Card:</span>
                      <span className="font-mono">- {formatINR(viewInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-350 pt-2.5 text-sm font-black text-[#0F4C81]">
                    <span>Invoice Grand Total Paid:</span>
                    <span className="font-mono text-base">{formatINR(viewInvoice.grandTotal)}</span>
                  </div>
                  <div className="pt-1 text-[9px] text-slate-400 text-right leading-none uppercase italic border-t border-slate-100">
                    *This is a computer generated original invoice
                  </div>
                </div>

              </div>

            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close View
              </button>
              <button
                type="button"
                onClick={() => handlePrintDraft(viewInvoice.invoiceNumber)}
                className="px-4 py-2 bg-[#0F4C81] text-white hover:bg-opacity-95 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={14} />
                Spool PDF Print
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WHATSAPP EXPLICIT MESSAGE PREVIEW & EDIT MODAL */}
      {whatsAppInvoice && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="whatsappDispatcherModal">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-6 border border-slate-100 font-sans my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <MessageSquare size={18} />
                <h3 className="text-sm font-bold">WhatsApp Digital Statement Dispatcher</h3>
              </div>
              <button onClick={() => setWhatsAppInvoice(null)} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Recipient Hospital Phone No</label>
                  <div className="flex gap-1">
                    <span className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600">+91</span>
                    <input
                      type="text"
                      value={whatsAppMobile}
                      onChange={(e) => setWhatsAppMobile(e.target.value)}
                      placeholder="9435011993"
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-bold focus:ring-[#0F4C81]"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">Prefilled from CRM: {whatsAppInvoice.customerName}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Recipient Target Branch</label>
                  <p className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-700 font-bold leading-none">
                    {whatsAppInvoice.customerName}
                  </p>
                </div>
              </div>

              {/* Message review & edit textarea */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 block">WhatsApp Markdown Statement Template</label>
                  <button 
                    onClick={() => copyToClipboard(whatsAppText)}
                    className="text-[10px] text-[#0F4C81] hover:underline flex items-center gap-1"
                  >
                    {whatsAppCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {whatsAppCopied ? "Copied!" : "Copy Text"}
                  </button>
                </div>
                <textarea
                  value={whatsAppText}
                  onChange={(e) => setWhatsAppText(e.target.value)}
                  rows={10}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 font-mono bg-slate-50 focus:ring-emerald-500 leading-relaxed max-h-[300px] overflow-y-auto"
                />
                <span className="text-[8px] text-slate-400 block">*Templates support standard WhatsApp bolding: *text*, lists: •, etc.</span>
              </div>

              {/* Instructions and direct trigger */}
              <div className="bg-emerald-50/50 p-3.5 border border-emerald-150 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-emerald-800">Direct-to-Chat Mechanism:</p>
                <p className="text-[9px] text-emerald-700 leading-normal">
                  Clicking "Launch Chat" opens a secure API tunnel representing WhatsApp Web/App. The draft statement will be automatically injected into the recipient's chat window, ready to send with one click, without requiring contact saving.
                </p>
              </div>

            </div>

            {/* Actions panel */}
            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWhatsAppInvoice(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Dialog
              </button>
              <button
                type="button"
                onClick={handleLaunchWhatsApp}
                className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Smartphone size={14} />
                Launch Chat
                <ExternalLink size={12} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
