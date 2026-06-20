import React from "react";
import { ERPData, SalesOrder, Customer, Product, InvoiceItem, SalesInvoice, InventoryLog, FinancialRecord } from "../types";
import { formatINR } from "../utils";
import { Plus, Trash2, FileText, CheckCircle, Smartphone, User, Play, AlertCircle } from "lucide-react";

interface SalesOrdersViewProps {
  data: ERPData;
  onSaveERPData: (updated: ERPData) => Promise<void>;
  currentUser: any;
  onLaunchPOSCart?: (cartItems: Array<{ productId: string; quantity: number; unitPrice: number }>, customerInfo: { id: string; name: string; mobile: string; gst: string }) => void;
}

export default function SalesOrdersView({ data, onSaveERPData, currentUser, onLaunchPOSCart }: SalesOrdersViewProps) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [hospitalPoNumber, setHospitalPoNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Order item cart
  const [cart, setCart] = React.useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>>([]);

  const [activeProductId, setActiveProductId] = React.useState("");
  const [activeQty, setActiveQty] = React.useState(1);
  const [activePrice, setActivePrice] = React.useState(0);

  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (activeProductId) {
      const p = data.products.find(prod => prod.id === activeProductId);
      if (p) setActivePrice(p.unitPrice);
    } else if (data.products.length > 0) {
      setActiveProductId(data.products[0].id);
      setActivePrice(data.products[0].unitPrice);
    }
  }, [activeProductId, data.products]);

  const handleAddLine = () => {
    if (!activeProductId) return;
    const p = data.products.find(prod => prod.id === activeProductId)!;
    setCart([
      ...cart,
      {
        productId: activeProductId,
        quantity: Number(activeQty),
        unitPrice: Number(activePrice)
      }
    ]);
    setActiveQty(1);
  };

  const handleRemoveLine = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleCreateSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a valid customer.");
      return;
    }
    if (cart.length === 0) {
      alert("Please add at least one medical product to this Sales Order.");
      return;
    }

    const customer = data.customers.find(c => c.id === selectedCustomerId)!;
    const totalAmount = cart.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0);
    const code = `SO-${Date.now().toString().slice(-4)}`;

    const newSO: SalesOrder = {
      id: `so-${Date.now()}`,
      orderNumber: code,
      customerId: selectedCustomerId,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerGst: customer.gstNumber || "Unregistered",
      hospitalPoNumber,
      date: new Date().toISOString(),
      items: cart.map(c => {
        const p = data.products.find(prod => prod.id === c.productId)!;
        return {
          productId: c.productId,
          name: p.name,
          sku: p.sku,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          gstRate: p.gstRate,
          totalAmount: (c.quantity * c.unitPrice) * (1 + p.gstRate / 100)
        };
      }),
      totalAmount,
      status: 'Confirmed',
      notes,
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    const updatedERP: ERPData = {
      ...data,
      salesOrders: [newSO, ...(data.salesOrders || [])],
      activityLogs: [
        {
          id: `act-so-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Sales Order",
          action: `Recorded Hospital PO matching draft Sales Order ${code} for "${customer.name}" totaling ₹${totalAmount.toFixed(2)}`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(updatedERP);
    setToast(`🎉 Sales Order ${code} submitted successfully!`);
    setShowCreateForm(false);
    setCart([]);
    setHospitalPoNumber("");
    setNotes("");
    setTimeout(() => setToast(null), 4000);
  };

  // Convert Sales Order / Hospital PO directly to Tax Invoice!
  const handleConvertSOToBill = async (so: SalesOrder) => {
    // 1. Verify Stock levels beforehand
    const stockErrors: string[] = [];
    so.items.forEach(item => {
      const p = data.products.find(prod => prod.id === item.productId);
      if (!p) {
        stockErrors.push(`Product "${item.name}" no longer exists in catalogs.`);
      } else if (p.currentStock < item.quantity) {
        stockErrors.push(`Insufficient stock for "${item.name}". Required: ${item.quantity}, Available: ${p.currentStock}`);
      }
    });

    if (stockErrors.length > 0) {
      alert(`⚠️ Stock verification failed before Invoicing:\n\n${stockErrors.join("\n")}\n\nPlease restock or modify the items before converting.`);
      return;
    }

    // 2. Generate compliant invoice items
    const invoiceItems: InvoiceItem[] = so.items.map(it => {
      const p = data.products.find(prod => prod.id === it.productId)!;
      const subLine = it.quantity * it.unitPrice;
      const gstAmount = (subLine * p.gstRate) / 100;
      return {
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        gstRate: p.gstRate,
        gstAmount,
        cgstAmount: gstAmount / 2,
        sgstAmount: gstAmount / 2,
        igstAmount: 0,
        totalAmount: subLine + gstAmount
      };
    });

    const subtotal = invoiceItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
    const totalGst = invoiceItems.reduce((acc, it) => acc + it.gstAmount, 0);
    const grandTotal = subtotal + totalGst;

    const invoiceCode = `DS-INV-${Date.now().toString().slice(-5)}`;

    const newInvoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceCode,
      customerId: so.customerId,
      customerName: so.customerName,
      customerMobile: so.customerMobile,
      customerGst: so.customerGst,
      customerState: "Assam Node (18)",
      items: invoiceItems,
      subtotal,
      totalGst,
      totalCgst: totalGst / 2,
      totalSgst: totalGst / 2,
      totalIgst: 0,
      grandTotal,
      discount: 0,
      date: new Date().toISOString(),
      paymentMethod: 'Bank Transfer',
      status: 'Unpaid', // Status starts as unpaid for hospital billing terms
      createdBy: `${currentUser.name} (${currentUser.role})`,
      salesOrderId: so.id,
      amountPaid: 0,
      paymentsList: []
    };

    // 3. Deduct physical stock levels
    const updatedProducts = data.products.map(p => {
      const match = so.items.find(it => it.productId === p.id);
      if (match) {
        // Also deduct from standard batch
        const updatedBatches = p.batches ? p.batches.map((b, idx) => {
          if (idx === 0) {
            return { ...b, currentStock: Math.max(0, b.currentStock - match.quantity) };
          }
          return b;
        }) : [];
        return {
          ...p,
          currentStock: Math.max(0, p.currentStock - match.quantity),
          batches: updatedBatches
        };
      }
      return p;
    });

    // 4. Update the source Sales Order status to 'Invoiced'
    const updatedSalesOrders = data.salesOrders?.map(item => {
      if (item.id === so.id) return { ...item, status: 'Invoiced' as const };
      return item;
    }) || [];

    // 5. Add ledger logs and financial records
    const newInventoryLogs = so.items.map(item => ({
      id: `log-so-inv-${Date.now()}-${item.productId}`,
      productId: item.productId,
      productName: item.name,
      sku: item.sku,
      actionType: 'Stock Adjustment' as const,
      quantity: -item.quantity,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: `Dispatch billed from Sales Order: ${so.orderNumber}`
    }));

    const finIncomeRecord: FinancialRecord = {
      id: `fin-so-inc-${Date.now()}`,
      type: 'Income',
      category: 'Sales Revenue',
      amount: grandTotal,
      gstImpact: totalGst,
      date: new Date().toISOString().split("T")[0],
      description: `Billed Hospital Order ${so.orderNumber} via Invoice ${invoiceCode}`
    };

    // 6. Update Customer lifetime value and outstanding payments
    const updatedCustomers = data.customers.map(c => {
      if (c.id === so.customerId) {
        return {
          ...c,
          lifetimeValue: c.lifetimeValue + grandTotal,
          outstandingPayments: c.outstandingPayments + grandTotal // Unpaid outstanding recorded
        };
      }
      return c;
    });

    const finalERP: ERPData = {
      ...data,
      products: updatedProducts,
      salesOrders: updatedSalesOrders,
      salesInvoices: [newInvoice, ...data.salesInvoices],
      customers: updatedCustomers,
      inventoryLogs: [...newInventoryLogs, ...data.inventoryLogs],
      financialRecords: [finIncomeRecord, ...data.financialRecords],
      activityLogs: [
        {
          id: `act-conv-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Hospital Invoice Flow",
          action: `Successfully pre-authorized and converted Sales Order ${so.orderNumber} to compliant GST Bill ${invoiceCode}`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(finalERP);
    setToast(`🎉 Order successfully converted to Tax Invoice ${invoiceCode}! Check active Invoices list.`);
    setTimeout(() => setToast(null), 4000);
  };

  const currentSOs = data.salesOrders || [];

  return (
    <div className="space-y-6 animate-fade-in">

      {toast && (
        <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header operations box */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Sales Orders & POs Tracker</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Record incoming hospital purchase orders, pre-validate stock allotments, and trigger dynamic single-click GST tax bill releases.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[#0F4C81] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          Create Hospital Sales Order
        </button>
      </div>

      {/* Sales Orders List Grid/Tables */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
              <th className="p-3">Order #</th>
              <th className="p-3">Client Hospital</th>
              <th className="p-3">Hospital PO Ref</th>
              <th className="p-3">Submission Date</th>
              <th className="p-3 text-right">Order Valuation (Excl Tax)</th>
              <th className="p-3 text-center">Fulfillment Status</th>
              <th className="p-3 text-center">Action Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {currentSOs.length > 0 ? (
              currentSOs.map((so) => (
                <tr key={so.id} className="hover:bg-slate-50/40">
                  <td className="p-3 font-mono font-bold text-[#0F4C81]">{so.orderNumber}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{so.customerName}</p>
                    <span className="text-[9px] text-slate-400">GST: {so.customerGst}</span>
                  </td>
                  <td className="p-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">{so.hospitalPoNumber || "None Provided"}</span></td>
                  <td className="p-3">{new Date(so.date).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatINR(so.totalAmount)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      so.status === 'Invoiced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {so.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {so.status !== 'Invoiced' ? (
                      <button
                        onClick={() => handleConvertSOToBill(so)}
                        className="px-2.5 py-1.5 bg-blue-50 text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white rounded text-[10px] font-bold cursor-pointer transition border border-blue-100 flex items-center justify-center gap-1 mx-auto"
                      >
                        <Play size={10} />
                        Verify & Billings Release
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <CheckCircle size={12} className="text-emerald-500" />
                        Invoiced
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                  No hospital sales order drafts registered yet. Create one above to initiate hospital PO workflow.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Sales Order Overlay Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateSO} className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-6 border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto my-8 font-sans">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#0F4C81] uppercase flex items-center gap-1.5">
                <FileText size={16} />
                Generate Hospital Sales Order Draft
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Target Hospital Client</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-white text-slate-700 font-bold focus:ring-[#0F4C81]"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {data.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Hospital Purchase Order Pin #</span>
                <input
                  type="text"
                  value={hospitalPoNumber}
                  onChange={(e) => setHospitalPoNumber(e.target.value)}
                  placeholder="e.g. AMRI-PO/8190B"
                  className="w-full border border-slate-200 rounded p-2 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Selector panel lines */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Declare Requisition Products</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Product Category</span>
                  <select
                    value={activeProductId}
                    onChange={(e) => setActiveProductId(e.target.value)}
                    className="w-full border border-slate-200 bg-white p-1.5 rounded text-[11px] font-semibold"
                  >
                    {data.products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Negotiated Selling Rate (₹)</span>
                  <input
                    type="number"
                    value={activePrice}
                    onChange={(e) => setActivePrice(Number(e.target.value))}
                    className="w-full border border-slate-200 bg-white p-1 rounded text-[11px] font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Requested Qty</span>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={activeQty}
                      onChange={(e) => setActiveQty(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-white p-1 rounded text-[11px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="px-3 bg-slate-800 text-white hover:bg-slate-900 rounded text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>

              {/* Basket list of lines in current order drafts */}
              <div className="border border-slate-200 bg-white rounded overflow-hidden max-h-[140px] overflow-y-auto divide-y">
                {cart.map((line, idx) => {
                  const p = data.products.find(prod => prod.id === line.productId)!;
                  return (
                    <div key={idx} className="p-2 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Qty: {line.quantity} units × ₹{line.unitPrice.toLocaleString('en-IN')} each (Excl. taxes)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-rose-500 hover:text-rose-700 bg-rose-50 p-1 rounded transition whitespace-nowrap"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-1">Contract / Delivery Terms Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Declare payment credit term windows (e.g. Net 30), floor delivery parameters..."
                className="w-full border border-slate-200 rounded p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Discard Draft
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#0F4C81] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Log Confirmed Order
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
