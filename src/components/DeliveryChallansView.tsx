import React from "react";
import { ERPData, DeliveryChallan, Customer, Product, InvoiceItem, SalesInvoice, InventoryLog, FinancialRecord } from "../types";
import { formatINR } from "../utils";
import { Plus, Trash2, FileText, CheckCircle, Navigation, ChevronRight, Check } from "lucide-react";

interface DeliveryChallansViewProps {
  data: ERPData;
  onSaveERPData: (updated: ERPData) => Promise<void>;
  currentUser: any;
}

export default function DeliveryChallansView({ data, onSaveERPData, currentUser }: DeliveryChallansViewProps) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [vehicleNumber, setVehicleNumber] = React.useState("");
  const [deliveryTerms, setDeliveryTerms] = React.useState("Immediate hospital bedside delivery");

  // Cart for challan
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

  const handleCreateDC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a valid customer.");
      return;
    }
    if (cart.length === 0) {
      alert("Please add at least one line item to this Delivery Challan.");
      return;
    }

    const customer = data.customers.find(c => c.id === selectedCustomerId)!;
    const totalAmount = cart.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0);
    const code = `DC-${Date.now().toString().slice(-4)}`;

    const newDC: DeliveryChallan = {
      id: `dc-${Date.now()}`,
      challanNumber: code,
      customerId: selectedCustomerId,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerGst: customer.gstNumber || "Unregistered",
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
      status: 'Dispatched',
      deliveryTerms,
      vehicleNumber,
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    const updatedERP: ERPData = {
      ...data,
      deliveryChallans: [newDC, ...(data.deliveryChallans || [])],
      activityLogs: [
        {
          id: `act-dc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Logistics",
          action: `Generated Dispatch Delivery Challan ${code} for customer "${customer.name}" via Vehicle ${vehicleNumber || "N/A"}`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(updatedERP);
    setToast(`🎉 Delivery Challan ${code} issued and stock dispatched!`);
    setShowCreateForm(false);
    setCart([]);
    setVehicleNumber("");
    setDeliveryTerms("Immediate hospital bedside delivery");
    setTimeout(() => setToast(null), 4000);
  };

  // Convert Delivery Challan directly to Tax Invoice once payment terms are set!
  const handleConvertDCToBill = async (dc: DeliveryChallan) => {
    // 1. Build compliant invoice items
    const invoiceItems: InvoiceItem[] = dc.items.map(it => {
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
      id: `inv-dc-${Date.now()}`,
      invoiceNumber: invoiceCode,
      customerId: dc.customerId,
      customerName: dc.customerName,
      customerMobile: dc.customerMobile,
      customerGst: dc.customerGst,
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
      status: 'Unpaid',
      createdBy: `${currentUser.name} (${currentUser.role})`,
      deliveryChallanId: dc.id,
      amountPaid: 0,
      paymentsList: []
    };

    // 2. Adjust product stocks (Dispatched stock has already left the building, so let's log and verify)
    // For standard compliance, issuing a DC locks/deducts stock if not done during DC dispatch status. Let's deduct:
    const updatedProducts = data.products.map(p => {
      const match = dc.items.find(it => it.productId === p.id);
      if (match) {
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

    // 3. Update Challan status to 'Invoiced'
    const updatedChallans = data.deliveryChallans?.map(item => {
      if (item.id === dc.id) return { ...item, status: 'Invoiced' as const };
      return item;
    }) || [];

    // 4. Log Inventory log deductions
    const newInventoryLogs = dc.items.map(item => ({
      id: `log-dc-inv-${Date.now()}-${item.productId}`,
      productId: item.productId,
      productName: item.name,
      sku: item.sku,
      actionType: 'Stock Adjustment' as const,
      quantity: -item.quantity,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: `Invoiced from pre-dispatched Delivery Challan: ${dc.challanNumber}`
    }));

    // 5. Save incoming revenue and customers records
    const finIncomeRecord: FinancialRecord = {
      id: `fin-dc-inc-${Date.now()}`,
      type: 'Income',
      category: 'Sales Revenue',
      amount: grandTotal,
      gstImpact: totalGst,
      date: new Date().toISOString().split("T")[0],
      description: `Billed Dispatch Challan ${dc.challanNumber} with invoice ${invoiceCode}`
    };

    const updatedCustomers = data.customers.map(c => {
      if (c.id === dc.customerId) {
        return {
          ...c,
          lifetimeValue: c.lifetimeValue + grandTotal,
          outstandingPayments: c.outstandingPayments + grandTotal
        };
      }
      return c;
    });

    const finalERP: ERPData = {
      ...data,
      products: updatedProducts,
      deliveryChallans: updatedChallans,
      salesInvoices: [newInvoice, ...data.salesInvoices],
      customers: updatedCustomers,
      inventoryLogs: [...newInventoryLogs, ...data.inventoryLogs],
      financialRecords: [finIncomeRecord, ...data.financialRecords],
      activityLogs: [
        {
          id: `act-conv-dc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Logistics",
          action: `Successfully converted Delivery Challan ${dc.challanNumber} to statutory Tax Invoice ${invoiceCode}`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(finalERP);
    setToast(`🎉 Delivery Challan successfully converted to Tax Invoice ${invoiceCode}!`);
    setTimeout(() => setToast(null), 4000);
  };

  const currentDCs = data.deliveryChallans || [];

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
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Challan / Dispatch Note Registry</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Issue high-priority delivery notes prior to invoices, lock safety batches, and convert them to compliant bills with custom credit terms.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[#0F4C81] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          Create Delivery Challan
        </button>
      </div>

      {/* DC List representation */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
              <th className="p-3">Challan #</th>
              <th className="p-3">Client Hospital</th>
              <th className="p-3">Vehicle Details</th>
              <th className="p-3">Date Dispatched</th>
              <th className="p-3 text-right">Items Value</th>
              <th className="p-3 text-center">Dispatch Status</th>
              <th className="p-3 text-center">Action Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {currentDCs.length > 0 ? (
              currentDCs.map((dc) => (
                <tr key={dc.id} className="hover:bg-slate-50/40">
                  <td className="p-3 font-mono font-bold text-[#0F4C81]">{dc.challanNumber}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{dc.customerName}</p>
                    <span className="text-[9px] text-slate-400 italic">"Terms: {dc.deliveryTerms}"</span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-500">{dc.vehicleNumber || "Hospital ambulance pickup"}</td>
                  <td className="p-3">{new Date(dc.date).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatINR(dc.totalAmount)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      dc.status === 'Invoiced' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {dc.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {dc.status !== 'Invoiced' ? (
                      <button
                        onClick={() => handleConvertDCToBill(dc)}
                        className="px-2.5 py-1.5 bg-sky-50 text-sky-800 border border-sky-150 hover:bg-sky-500 hover:text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1 mx-auto"
                      >
                        <ChevronRight size={10} />
                        Settle Terms & Bill
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 select-none">
                        <Check size={12} className="text-emerald-500 font-bold" />
                        Invoiced
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                  No active delivery challans outstanding. Issue pre-bill logistics sheets as needed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Issuing Form overlay */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateDC} className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-6 border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto my-8 font-sans">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#0F4C81] uppercase flex items-center gap-1.5">
                <Navigation size={16} />
                Issue New Delivery Challan Dispatch Note
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Destination Hospital</span>
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
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Logistics Vehicle / Handover Details</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. AS-11C/6201 (Truck)"
                  className="w-full border border-slate-200 rounded p-2 text-xs text-slate-800 font-bold"
                />
              </div>
            </div>

            {/* Selector panel lines */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 font-sans">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Declare Dispatched Goods</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Product</span>
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
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Est unit value (₹)</span>
                  <input
                    type="number"
                    value={activePrice}
                    onChange={(e) => setActivePrice(Number(e.target.value))}
                    className="w-full border border-slate-200 bg-white p-1 rounded text-[11px] font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Quantity</span>
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

              {/* Basket list of lines in current challan draft */}
              <div className="border border-slate-200 bg-white rounded overflow-hidden max-h-[140px] overflow-y-auto divide-y">
                {cart.map((line, idx) => {
                  const p = data.products.find(prod => prod.id === line.productId)!;
                  return (
                    <div key={idx} className="p-2 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Dispatched Qty: {line.quantity} units | Valuation rate: ₹{line.unitPrice.toLocaleString('en-IN')} each
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-rose-500 hover:text-rose-700 bg-rose-50 p-1 rounded transition"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-1">Special Handover Dispatch instructions</span>
              <textarea
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
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
                className="px-6 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Dispatch Goods & Lock Stock
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
