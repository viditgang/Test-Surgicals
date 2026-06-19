import React from "react";
import { ERPData, Product, InventoryActionType, User } from "../types";
import { formatINR } from "../utils";
import { 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  Activity, 
  ArrowRight, 
  Trash2, 
  ClipboardList, 
  RefreshCcw,
  Check,
  TrendingDown,
  FileSpreadsheet
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

interface InventoryViewProps {
  data: ERPData;
  currentUser: User;
  onPostInventoryAction: (payload: {
    productId: string;
    actionType: InventoryActionType;
    quantity: number;
    notes: string;
    user: string;
  }) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onBulkImport?: (items: any[]) => void;
}

export default function InventoryView({ data, currentUser, onPostInventoryAction, onAddProduct, onBulkImport }: InventoryViewProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [showAddStockModal, setShowAddStockModal] = React.useState(false);
  const [showNewProductModal, setShowNewProductModal] = React.useState(false);
  const [showImportWidget, setShowImportWidget] = React.useState(false);
  
  // States for stock action form
  const [actionProductId, setActionProductId] = React.useState("");
  const [actionType, setActionType] = React.useState<InventoryActionType>("Add Stock");
  const [actionQuantity, setActionQuantity] = React.useState(10);
  const [actionNotes, setActionNotes] = React.useState("");

  // States for new product form
  const [newName, setNewName] = React.useState("");
  const [newSku, setNewSku] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("Consumables");
  const [newBrand, setNewBrand] = React.useState("");
  const [newManufacturer, setNewManufacturer] = React.useState("");
  const [newUnitPrice, setNewUnitPrice] = React.useState(100);
  const [newPurchasePrice, setNewPurchasePrice] = React.useState(60);
  const [newGstRate, setNewGstRate] = React.useState(12);
  const [newReorderLevel, setNewReorderLevel] = React.useState(100);
  const [newCurrentStock, setNewCurrentStock] = React.useState(250);
  const [newWarehouseLocation, setNewWarehouseLocation] = React.useState("Aisle A1 - Rack 1");
  const [newBatchNumber, setNewBatchNumber] = React.useState("BATCH-26");
  const [newExpiryDate, setNewExpiryDate] = React.useState("2029-12-31");

  // Get categories for filtering
  const categories = ["All", ...new Set(data.products.map(p => p.category))];

  // Filter products by searching Name, SKU, Brand or category
  const filteredProducts = data.products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionProductId) {
      alert("Please select a product first");
      return;
    }
    
    onPostInventoryAction({
      productId: actionProductId,
      actionType,
      quantity: Number(actionQuantity),
      notes: actionNotes || `Stock operation: ${actionType}`,
      user: `${currentUser.name} (${currentUser.role})`
    });

    // Reset action modal/state
    setShowAddStockModal(false);
    setActionProductId("");
    setActionNotes("");
    setActionQuantity(10);
  };

  const handleNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSku) {
      alert("Name and SKU are required");
      return;
    }

    onAddProduct({
      name: newName,
      sku: newSku,
      category: newCategory,
      brand: newBrand || "Generic",
      manufacturer: newManufacturer || "Unknown",
      unitPrice: Number(newUnitPrice),
      purchasePrice: Number(newPurchasePrice),
      gstRate: Number(newGstRate),
      reorderLevel: Number(newReorderLevel),
      currentStock: Number(newCurrentStock),
      warehouseLocation: newWarehouseLocation || "Main Warehouse",
      batchNumber: newBatchNumber || "GENERIC-2026",
      expiryDate: newExpiryDate || "2031-12-31"
    });

    // Reset state & close modal
    setShowNewProductModal(false);
    setNewName("");
    setNewSku("");
    setNewBrand("");
    setNewManufacturer("");
  };

  return (
    <div className="space-y-6">
      
      {/* Search Filter and Quick Actions bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Name, SKU, Brand or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81] text-xs font-medium"
          />
        </div>

        {/* Filters and buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setShowAddStockModal(true);
              if (data.products.length > 0) {
                setActionProductId(data.products[0].id);
              }
            }}
            className="px-3.5 py-1.5 bg-[#4A90E2] font-semibold text-white text-xs rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Activity size={14} />
            Stock Adjust In/Out
          </button>

          <button
            onClick={() => setShowImportWidget(!showImportWidget)}
            className={`px-3.5 py-1.5 border text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 ${showImportWidget ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel / CSV Import</span>
          </button>

          <button
            onClick={() => setShowNewProductModal(true)}
            className="px-3.5 py-1.5 bg-[#0F4C81] font-semibold text-white text-xs rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} />
            Create Product Master
          </button>

        </div>
      </div>

      {showImportWidget && onBulkImport && (
        <ExcelImportWidget 
          type="inventory" 
          onImport={(items) => {
            onBulkImport(items);
            setShowImportWidget(false);
          }} 
        />
      )}

      {/* Main product log roster */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Inventory Catalog Master</h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">
            Showing {filteredProducts.length} of {data.products.length} Products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Brand / Manufacturer</th>
                <th className="py-3 px-4 text-right">Prices & GST</th>
                <th className="py-3 px-4 text-center">Batch / Expiry</th>
                <th className="py-3 px-4 text-center">Warehouse Location</th>
                <th className="py-3 px-4 text-right">Qty in Hand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {filteredProducts.map(p => {
                const isLow = p.currentStock > 0 && p.currentStock <= p.reorderLevel;
                const isOut = p.currentStock === 0;
                const isExpired = new Date(p.expiryDate) < new Date();
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {p.sku}
                        </span>
                        <span className="text-[10px] bg-[#DCEEFF] text-[#0F4C81] px-1.5 rounded">
                          {p.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5 text-slate-500">
                      <p className="font-semibold text-slate-800">{p.brand}</p>
                      <p className="text-[10px] truncate max-w-[150px]">{p.manufacturer}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right space-y-0.5">
                      <p className="font-bold text-slate-800">U.P: {formatINR(p.unitPrice)}</p>
                      <p className="text-[10px] text-slate-400">Buy: {formatINR(p.purchasePrice)} • GST: {p.gstRate}%</p>
                    </td>
                    <td className="py-3.5 px-4 text-center space-y-1">
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border block w-max mx-auto">
                        {p.batchNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.25 rounded block w-max mx-auto
                        ${isExpired 
                          ? "bg-rose-50 text-rose-600 border border-rose-200" 
                          : "text-slate-500"
                        }
                      `}>
                        Exp: {p.expiryDate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 text-[11px] font-mono">
                      {p.warehouseLocation}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isOut ? (
                        <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <p className={`text-sm font-bold
                            ${isLow ? "text-amber-500" : "text-[#0F4C81]"}
                          `}>
                            {p.currentStock} Units
                          </p>
                          {isLow && (
                            <span className="inline-block text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.25 rounded border border-amber-200">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No surgical items found matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Stock Actions Panel */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <ClipboardList size={18} />
              Commit Physical Inventory Log
            </h3>

            <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
              {/* Product Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Product SKU Catalog</label>
                <select
                  value={actionProductId}
                  onChange={(e) => setActionProductId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                >
                  {data.products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku}] - Current: {p.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as InventoryActionType)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="Add Stock">Add Stock (Supplier consignment)</option>
                  <option value="Stock Adjustment">Stock Adjustment (Excel manual tweak)</option>
                  <option value="Transfer Stock">Transfer Stock (Silchar Showroom to Godown)</option>
                  <option value="Damaged Stock Entry">Damaged Stock Entry (Deduct)</option>
                  <option value="Expired Stock Entry">Expired Stock Entry (Surgical item disposal)</option>
                </select>
              </div>

              {/* Physical quantity */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Batch Quantity Count</label>
                <input
                  type="number"
                  min="1"
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  required
                />
              </div>

              {/* Action notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Action Log Audit Notes</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Received damaged from box, expired lot, etc."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81] h-20"
                ></textarea>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-semibold hover:bg-opacity-90 transition cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} />
                  Authorize Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Product Master */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 border border-slate-100 my-8">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Plus size={18} />
              Register New Equipment Product Master
            </h3>

            <form onSubmit={handleNewProductSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Product Name */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Surgical / Medical Equipment Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Disposable Blood Transfusion Set 15 Drops"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  required
                />
              </div>

              {/* SKU */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SKU Code</label>
                <input
                  type="text"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. DS-CO-BT15"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                >
                  <option value="Consumables">Consumables</option>
                  <option value="Orthopedic Implants">Orthopedic Implants</option>
                  <option value="Respiratory Equipments">Respiratory Equipments</option>
                  <option value="Diagostics & Monitors">Diagostics & Monitors</option>
                  <option value="O.T. Surgical Sets">O.T. Surgical Sets</option>
                </select>
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Brand</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. DispoVan"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Manufacturer */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Manufacturer</label>
                <input
                  type="text"
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  placeholder="e.g. Hindustan Syringes Limited"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Unit selling price */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unit Selling Price (₹)</label>
                <input
                  type="number"
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  required
                />
              </div>

              {/* Purchase Cost price */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unit Purchase Price (₹)</label>
                <input
                  type="number"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  required
                />
              </div>

              {/* GST rate */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GST Slab Percentage</label>
                <select
                  value={newGstRate}
                  onChange={(e) => setNewGstRate(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                >
                  <option value={5}>5% (Basic Meds)</option>
                  <option value={12}>12% (Disposables / Concentrators)</option>
                  <option value={18}>18% (Diagnostics & Monitors / Implants)</option>
                  <option value={28}>28% (Specialized Goods)</option>
                </select>
              </div>

              {/* Reorder Threshold buffer */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reorder Buffer Quantity Threshold</label>
                <input
                  type="number"
                  value={newReorderLevel}
                  onChange={(e) => setNewReorderLevel(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  required
                />
              </div>

              {/* Warehouse storage code */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Warehouse Location Coordinates</label>
                <input
                  type="text"
                  value={newWarehouseLocation}
                  onChange={(e) => setNewWarehouseLocation(e.target.value)}
                  placeholder="e.g. Closet C3, Rack 2"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Batch tag */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Consignment Batch Tag</label>
                <input
                  type="text"
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  placeholder="e.g. BT-991A"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expiration Date</label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Opening Stock */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opening Physical Stock</label>
                <input
                  type="number"
                  value={newCurrentStock}
                  onChange={(e) => setNewCurrentStock(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs text-[#0F4C81] font-bold"
                  required
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-semibold hover:bg-opacity-90 transition cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} />
                  Authorize Product Master
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
