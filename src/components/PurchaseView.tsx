import React from "react";
import { ERPData, PurchaseOrder, Product, Supplier, POItem, User } from "../types";
import { formatINR } from "../utils";
import { 
  Plus, 
  Trash2, 
  Lock, 
  FileCheck2, 
  Truck, 
  FileText, 
  RefreshCcw,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

interface PurchaseViewProps {
  data: ERPData;
  currentUser: User;
  onCreatePO: (po: Omit<PurchaseOrder, 'id'>) => void;
  onApprovePO: (poId: string, approvedBy: string) => void;
  onReceiveGoods: (poId: string, receivedBy: string, billNumber: string) => void;
  onBulkImport?: (items: any[]) => void;
}

export default function PurchaseView({ data, currentUser, onCreatePO, onApprovePO, onReceiveGoods, onBulkImport }: PurchaseViewProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = React.useState("");
  const [poNotes, setPoNotes] = React.useState("");
  const [showImportWidget, setShowImportWidget] = React.useState(false);

  // Grid builder states
  const [cartItems, setCartItems] = React.useState<Array<{
    productId: string;
    quantity: number;
    purchasePrice: number;
  }>>([]);

  const [activeItemProductId, setActiveItemProductId] = React.useState("");
  const [activeItemQty, setActiveItemQty] = React.useState(10);
  const [activeItemPrice, setActiveItemPrice] = React.useState(0);

  // Auto trigger default product price when product selected for PO cart
  React.useEffect(() => {
    if (activeItemProductId) {
      const p = data.products.find(prod => prod.id === activeItemProductId);
      if (p) {
        setActiveItemPrice(p.purchasePrice);
      }
    } else if (data.products.length > 0) {
      setActiveItemProductId(data.products[0].id);
      setActiveItemPrice(data.products[0].purchasePrice);
    }
  }, [activeItemProductId, data.products]);

  React.useEffect(() => {
    if (data.suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(data.suppliers[0].id);
    }
  }, [data.suppliers, selectedSupplierId]);

  const handleAddItemToCart = () => {
    if (!activeItemProductId) return;
    
    // Check if product already in cart
    const existingIdx = cartItems.findIndex(i => i.productId === activeItemProductId);
    if (existingIdx !== -1) {
      const updated = [...cartItems];
      updated[existingIdx].quantity += Number(activeItemQty);
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: activeItemProductId,
          quantity: Number(activeItemQty),
          purchasePrice: Number(activeItemPrice)
        }
      ]);
    }
    // reset item controls
    setActiveItemQty(10);
  };

  const handleRemoveItemFromCart = (idx: number) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  const handleSavePO = () => {
    if (!selectedSupplierId) {
      alert("Please select a manufacturing supplier.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Cart cannot be empty. Please add items first.");
      return;
    }

    const supplierObj = data.suppliers.find(s => s.id === selectedSupplierId);
    if (!supplierObj) return;

    // Build items with proper fields and Indian taxes (GST)
    const items: POItem[] = cartItems.map(item => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      const subtotal = item.quantity * item.purchasePrice;
      const totalGst = (subtotal * p.gstRate) / 100;
      return {
        productId: item.productId,
        name: p.name,
        sku: p.sku,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        gstRate: p.gstRate,
        totalGst,
        totalAmount: subtotal + totalGst
      };
    });

    const totalAmount = items.reduce((acc, i) => acc + i.totalAmount, 0);
    const totalGst = items.reduce((acc, i) => acc + i.totalGst, 0);
    const orderNo = `DS-PO-${Date.now().toString().slice(-5)}`;

    onCreatePO({
      poNumber: orderNo,
      supplierId: selectedSupplierId,
      supplierName: supplierObj.name,
      items,
      orderDate: new Date().toISOString().split('T')[0],
      status: "Draft",
      totalAmount,
      totalGst,
      notes: poNotes
    });

    // Close and reset
    setShowCreateDialog(false);
    setCartItems([]);
    setPoNotes("");
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Procurement & Purchase Workflow</h2>
          <p className="text-[11px] text-slate-500">Draft POs, authorize approvals, verify received surgical consignments, and bulk auto-adjust levels.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowImportWidget(!showImportWidget)}
            className={`px-4 py-2 border text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 ${showImportWidget ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel / CSV Import</span>
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-semibold rounded-xl hover:bg-opacity-95 transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} />
            Create Purchase Order (PO)
          </button>
        </div>
      </div>

      {showImportWidget && onBulkImport && (
        <ExcelImportWidget 
          type="purchases" 
          onImport={(items) => {
            onBulkImport(items);
            setShowImportWidget(false);
          }} 
        />
      )}

      {/* PO List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase History Registry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-medium text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">PO Document No</th>
                <th className="py-3 px-4">Supplier Partner</th>
                <th className="py-3 px-4">Order Items</th>
                <th className="py-3 px-4 text-right">Taxes & Amount</th>
                <th className="py-3 px-4 text-center">Workflow Stage</th>
                <th className="py-3 px-4 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {data.purchaseOrders.map((po) => {
                const isDraft = po.status === 'Draft';
                const isApproved = po.status === 'Approved';
                const isReceived = po.status === 'Received';
                
                return (
                  <tr key={po.id} className="hover:bg-slate-50/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#0F4C81] font-mono">{po.poNumber}</p>
                      <p className="text-[10px] text-slate-400">Date: {po.orderDate}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {po.supplierName}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate block mt-1">
                      {po.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <p className="font-bold text-slate-800">{formatINR(po.totalAmount)}</p>
                      <p className="text-[9px] text-slate-400">Incl. ₹{po.totalGst.toFixed(0)} GST</p>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.75 rounded-full border
                        ${isDraft 
                          ? "bg-slate-100 text-slate-600 border-slate-200" 
                          : isApproved 
                          ? "bg-blue-50 text-[#0F4C81] border-blue-200 animate-pulse" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }
                      `}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDraft && (
                        <button
                          onClick={() => onApprovePO(po.id, `${currentUser.name} (${currentUser.role})`)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <FileCheck2 size={12} />
                          Approve PO
                        </button>
                      )}
                      
                      {isApproved && (
                        <button
                          onClick={() => {
                            const billNo = prompt("Enter Supplier Invoice/Bill number to record receipt:", `SPD/SIL/${Date.now().toString().slice(-4)}`);
                            if (billNo) {
                              onReceiveGoods(po.id, `${currentUser.name} (${currentUser.role})`, billNo);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Truck size={12} />
                          Receive Goods & Add Stock
                        </button>
                      )}

                      {isReceived && (
                        <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                          <p>Received by {po.receivedBy}</p>
                          <p className="font-mono">Bill: {po.billNumber}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No active Purchase Orders found. Start sourcing from manufacturers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE PURCHASE ORDER */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl p-6 border border-slate-100 my-8">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100">
              Draft New Manufacturing Purchase Order
            </h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Form: Metadata and adding item */}
              <div className="space-y-4 md:col-span-1">
                
                {/* Select Supplier */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Select Supplier Co.</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 bg-white"
                  >
                    {data.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Divider Line */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add Cart Item</h4>
                  
                  {/* Select Product */}
                  <div className="space-y-1 mb-3">
                    <label className="text-[10px] font-bold text-slate-400 block">Equipment Item</label>
                    <select
                      value={activeItemProductId}
                      onChange={(e) => setActiveItemProductId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white"
                    >
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pricing and Qty side-by-side */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-400 block">Order Price (₹)</label>
                      <input
                        type="number"
                        value={activeItemPrice}
                        onChange={(e) => setActiveItemPrice(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-400 block">Unit Qty</label>
                      <input
                        type="number"
                        value={activeItemQty}
                        onChange={(e) => setActiveItemQty(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="w-full py-2 bg-[#4A90E2] text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition cursor-pointer"
                  >
                    Append to PO
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Payment Notes / Terms Reminder</label>
                  <textarea
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Provide special instructions here..."
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs h-16 resize-none"
                  ></textarea>
                </div>

              </div>

              {/* Right Table: Cartesian matrix of the current cart */}
              <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                
                <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100 p-2.5 text-xs font-bold text-slate-700">
                    Draft PO Cart Summary
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-150">
                    {cartItems.map((item, idx) => {
                      const p = data.products.find(prod => prod.id === item.productId)!;
                      return (
                        <div key={idx} className="p-3 text-xs flex justify-between items-center bg-white">
                          <div className="space-y-0.5 flex-1 pr-4">
                            <p className="font-bold text-slate-800 line-clamp-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {p.sku} • ₹{item.purchasePrice} / unit • GST: {p.gstRate}%
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-slate-800 font-mono">
                                ₹{((item.quantity * item.purchasePrice) * (1 + p.gstRate / 100)).toFixed(2)}
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold">{item.quantity} units</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromCart(idx)}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {cartItems.length === 0 && (
                      <p className="p-12 text-center text-xs text-slate-450 font-medium">Add equipment to start drafting PO.</p>
                    )}
                  </div>
                </div>

                {/* Authorize buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                  <div className="text-xs">
                    <p className="text-slate-400">Estimated Total Order Cost</p>
                    <p className="text-lg font-bold text-[#0F4C81]">
                      {formatINR(cartItems.reduce((acc, item) => {
                        const p = data.products.find(prod => prod.id === item.productId)!;
                        const sub = item.quantity * item.purchasePrice;
                        return acc + sub + (sub * p.gstRate / 100);
                      }, 0))}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateDialog(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer hover:bg-slate-50"
                    >
                      Discard & Exit
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePO}
                      className="px-5 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-950/15 cursor-pointer"
                    >
                      Authorize Draft PO
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
