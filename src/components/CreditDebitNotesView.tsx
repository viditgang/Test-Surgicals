import React from "react";
import { ERPData, GstNote, Customer, SalesInvoice, Product } from "../types";
import { formatINR } from "../utils";
import { Plus, Trash2, FileText, CheckCircle, RefreshCcw, Landmark, User, ShieldAlert } from "lucide-react";

interface CreditDebitNotesViewProps {
  data: ERPData;
  onSaveERPData: (updated: ERPData) => Promise<void>;
  currentUser: any;
}

export default function CreditDebitNotesView({ data, onSaveERPData, currentUser }: CreditDebitNotesViewProps) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [noteType, setNoteType] = React.useState<'Credit' | 'Debit'>('Credit');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [reason, setReason] = React.useState("Goods Returned");
  const [revertStock, setRevertStock] = React.useState(true);
  const [adjustLedger, setAdjustLedger] = React.useState(true);
  const [reverseGst, setReverseGst] = React.useState(true);

  // Cart for credit/debit items
  const [cart, setCart] = React.useState<Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
  }>>([]);

  const [activeProductId, setActiveProductId] = React.useState("");
  const [activeQty, setActiveQty] = React.useState(1);
  const [activePrice, setActivePrice] = React.useState(0);

  // Quick success alerts
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (activeProductId) {
      const p = data.products.find(prod => prod.id === activeProductId);
      if (p) setActivePrice(p.unitPrice);
    } else if (data.products.length > 0) {
      setActiveProductId(data.products[0].id);
      setActivePrice(data.products[0].unitPrice);
    }
  }, [activeProductId, data.products]);

  // Load customer completed invoices automatically
  const customerInvoices = data.salesInvoices.filter(i => i.customerId === selectedCustomerId);

  const handleAddLine = () => {
    if (!activeProductId) return;
    const p = data.products.find(prod => prod.id === activeProductId)!;
    
    setCart([
      ...cart,
      {
        productId: activeProductId,
        name: p.name,
        quantity: Number(activeQty),
        unitPrice: Number(activePrice),
        gstRate: p.gstRate
      }
    ]);
    setActiveQty(1);
  };

  const handleRemoveLine = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a valid customer.");
      return;
    }
    if (cart.length === 0) {
      alert("Please add at least one line item to return / correct.");
      return;
    }

    const customer = data.customers.find(c => c.id === selectedCustomerId)!;
    const invoice = data.salesInvoices.find(i => i.id === selectedInvoiceId);

    // Compute totals
    const subtotal = cart.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0);
    const totalGst = cart.reduce((acc, c) => acc + (c.quantity * c.unitPrice * c.gstRate) / 100, 0);
    const grandTotal = subtotal + totalGst;

    const code = `${noteType === 'Credit' ? 'CN' : 'DN'}-${Date.now().toString().slice(-4)}`;

    const newNote: GstNote = {
      id: `gstnote-${Date.now()}`,
      noteNumber: code,
      type: noteType,
      invoiceId: selectedInvoiceId || "manual-entry",
      invoiceNumber: invoice ? invoice.invoiceNumber : "Manual Overbilling Correction",
      customerId: selectedCustomerId,
      customerName: customer.name,
      date: new Date().toISOString(),
      items: cart.map(c => ({
        productId: c.productId,
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        gstRate: c.gstRate,
        gstAmount: (c.quantity * c.unitPrice * c.gstRate) / 100,
        totalAmount: (c.quantity * c.unitPrice) * (1 + c.gstRate / 100)
      })),
      subtotal,
      totalGst,
      grandTotal,
      cgstAmount: reverseGst ? totalGst / 2 : 0,
      sgstAmount: reverseGst ? totalGst / 2 : 0,
      igstAmount: 0,
      reason,
      gstReversed: reverseGst,
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    // Deep State mutation variables
    let updatedProducts = [...data.products];
    let updatedCustomers = [...data.customers];
    let updatedInventoryLogs = [...data.inventoryLogs];
    let updatedFinancialRecords = [...data.financialRecords];

    // 1. Revert physical Stock batches if requested
    if (revertStock) {
      updatedProducts = data.products.map(p => {
        const matchedReturnItem = cart.find(item => item.productId === p.id);
        if (matchedReturnItem) {
          // Increment stock back
          const newStock = p.currentStock + matchedReturnItem.quantity;
          
          // Credit back into the first batch or create standard batches list update
          const updatedBatches = p.batches ? p.batches.map((b, idx) => {
            if (idx === 0) { // Credit into oldest/first active batch directly
              return { ...b, currentStock: b.currentStock + matchedReturnItem.quantity };
            }
            return b;
          }) : [];

          // Log stock increment
          updatedInventoryLogs.push({
            id: `log-return-${Date.now()}-${p.id}`,
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            actionType: 'Stock Adjustment',
            quantity: matchedReturnItem.quantity,
            date: new Date().toISOString(),
            user: `${currentUser.name}`,
            notes: `GST Return Stock Credit: Assigned against ${code}`
          });

          return {
            ...p,
            currentStock: newStock,
            batches: updatedBatches
          };
        }
        return p;
      });
    }

    // 2. Adjust Customer outstanding accounting ledger
    if (adjustLedger) {
      updatedCustomers = data.customers.map(c => {
        if (c.id === selectedCustomerId) {
          // Credit note reduces customer outstanding liability or lifetime value
          return {
            ...c,
            outstandingPayments: Math.max(0, c.outstandingPayments - grandTotal),
            lifetimeValue: Math.max(0, c.lifetimeValue - grandTotal)
          };
        }
        return c;
      });
    }

    // 3. reverse GST Impact / Income correction in financial records
    if (reverseGst) {
      updatedFinancialRecords.push({
        id: `fin-rev-${Date.now()}`,
        type: noteType === 'Credit' ? 'Expense' : 'Income', // Credit reverses sales income
        category: "Other",
        amount: grandTotal,
        gstImpact: -totalGst,
        date: new Date().toISOString().split("T")[0],
        description: `GST Note Reversal ${code} for corrected invoice ${newNote.invoiceNumber}`
      });
    }

    // compile and save updated state globally
    const updatedERP: ERPData = {
      ...data,
      products: updatedProducts,
      customers: updatedCustomers,
      inventoryLogs: updatedInventoryLogs,
      financialRecords: updatedFinancialRecords,
      gstNotes: [newNote, ...(data.gstNotes || [])],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Finance Note",
          action: `Generated GST ${noteType} Note ${code} for customer "${customer.name}" totaling ₹${grandTotal.toFixed(2)}`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(updatedERP);

    setFeedback(`🎉 Note ${code} created successfully. State sync processed!`);
    setShowCreateForm(false);
    setCart([]);
    setSelectedCustomerId("");
    setSelectedInvoiceId("");
    setTimeout(() => setFeedback(null), 4000);
  };

  const currentNotes = data.gstNotes || [];

  return (
    <div className="space-y-6">
      
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Intro Header */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credit Notes & Debit Notes Registry</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Handle hospital returns, correct billing discrepancy, and process compliant GST reversals in real-time.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[#0F4C81] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
        >
          <Plus size={14} />
          Create Credit/Debit Note
        </button>
      </div>

      {/* Notes list */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
              <th className="p-3">Note Number</th>
              <th className="p-3">Type</th>
              <th className="p-3">Customer Details</th>
              <th className="p-3">Ref Invoice</th>
              <th className="p-3">Reason / Description</th>
              <th className="p-3 text-right">Taxable Corrected</th>
              <th className="p-3 text-right">GST Reversed</th>
              <th className="p-3 text-right">Grand Net Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {currentNotes.length > 0 ? (
              currentNotes.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50/40">
                  <td className="p-3 font-mono font-bold text-[#0F4C81]">{note.noteNumber}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      note.type === 'Credit' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {note.type} Note
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{note.customerName}</p>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{note.date.split("T")[0]}</span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-500">{note.invoiceNumber}</td>
                  <td className="p-3 font-medium italic text-slate-500">"{note.reason}"</td>
                  <td className="p-3 text-right font-mono font-semibold">{formatINR(note.subtotal)}</td>
                  <td className="p-3 text-right font-mono text-xs">{formatINR(note.totalGst)}</td>
                  <td className="p-3 text-right font-black text-[#0F4C81] font-mono text-sm">{formatINR(note.grandTotal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                  No credit notes or debit notes filed for this accounting cycle yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Note modal Form overlay */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSubmitNote} className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto my-8 font-sans">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#0F4C81] uppercase flex items-center gap-1.5">
                <Landmark size={16} />
                Register GST Credit/Debit Note
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Note Type Selection</span>
                <select
                  value={noteType}
                  onChange={(e: any) => setNoteType(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-white text-slate-700 font-bold focus:ring-[#0F4C81]"
                >
                  <option value="Credit">Credit Note (Hospital Sales Return, Discount, Overbilling)</option>
                  <option value="Debit">Debit Note (Purchase adjustment, Extra charges)</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Select Hospital Client</span>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Target Billing Reference (Optional)</span>
                <select
                  value={selectedInvoiceId}
                  disabled={!selectedCustomerId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-white text-slate-700 font-bold disabled:bg-slate-50"
                >
                  <option value="">-- Choose Completed Invoice --</option>
                  {customerInvoices.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.invoiceNumber} Total: ₹{i.grandTotal.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Statutory Reason Code</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-white text-slate-700 font-bold focus:ring-[#0F4C81]"
                >
                  <option value="Goods Returned">Goods returned by Hospital / Expired Stock</option>
                  <option value="Over-billing Correction">Original Bill Discrepancy Correction</option>
                  <option value="Discount Post-Invoice">Trade discount cleared after release</option>
                  <option value="Deficiency in Service">Deficiency in medical goods / Damage claim</option>
                </select>
              </div>
            </div>

            {/* Credit Note item cart configuration */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Declare Item Return Details</h4>
              
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
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Unit Price (₹)</span>
                  <input
                    type="number"
                    value={activePrice}
                    onChange={(e) => setActivePrice(Number(e.target.value))}
                    className="w-full border border-slate-200 bg-white p-1 rounded text-[11px] font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold block mb-0.5">Return Qty</span>
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
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Basket list of returning lines */}
              <div className="border border-slate-200 bg-white rounded overflow-hidden max-h-[140px] overflow-y-auto divide-y">
                {cart.map((line, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center text-[11px]">
                    <div>
                      <p className="font-bold text-slate-800">{line.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        Qty: {line.quantity} × ₹{line.unitPrice.toLocaleString('en-IN')} | Tax Base: {line.gstRate}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-rose-500 hover:text-rose-700 bg-rose-50 p-1 rounded transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger adjustments options checkbox triggers */}
            <div className="p-3.5 bg-[#FFFCE8] border border-[#FBEFBE] rounded-xl space-y-2">
              <h4 className="text-[10px] font-bold text-amber-900 uppercase">Compliance ledger adjustments checklist</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revertStock}
                    onChange={(e) => setRevertStock(e.target.checked)}
                    className="rounded text-[#0F4C81] h-3.5 w-3.5"
                  />
                  <span>Revert stock to physical batches</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustLedger}
                    onChange={(e) => setAdjustLedger(e.target.checked)}
                    className="rounded text-[#0F4C81] h-3.5 w-3.5"
                  />
                  <span>Adjust Customer Outstanding</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reverseGst}
                    onChange={(e) => setReverseGst(e.target.checked)}
                    className="rounded text-[#0F4C81] h-3.5 w-3.5"
                  />
                  <span>Log statutory GST Reversal link</span>
                </label>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                Release GST Note
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
