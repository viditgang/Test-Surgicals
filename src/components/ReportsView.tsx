import React from "react";
import { ERPData, Product } from "../types";
import { formatINR, exportToCSV } from "../utils";
import { 
  FileText, 
  ArrowDownToLine, 
  Search, 
  History, 
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle,
  Briefcase
} from "lucide-react";

interface ReportsViewProps {
  data: ERPData;
}

export default function ReportsView({ data }: ReportsViewProps) {
  const [reportRange, setReportRange] = React.useState<"daily" | "weekly" | "monthly" | "quarterly">("monthly");
  
  // Calculate analytics
  const totalValuation = data.products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
  const salesSum = data.salesInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const purchaseSum = data.purchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0);

  // Expiry calculations
  const today = new Date();
  const expiringNext30 = data.products.filter(p => {
    const exp = new Date(p.expiryDate);
    const diff = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  const expiringNext90 = data.products.filter(p => {
    const exp = new Date(p.expiryDate);
    const diff = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays > 30 && diffDays <= 90;
  });

  // Handle excel sheet mock downloading
  const triggerCsvDownload = (scope: string) => {
    if (scope === 'inventory') {
      const formatted = data.products.map(p => ({
        Name: p.name,
        SKU: p.sku,
        Category: p.category,
        Brand: p.brand,
        Price: p.unitPrice,
        Cost: p.purchasePrice,
        Stock: p.currentStock,
        Location: p.warehouseLocation,
        BatchNo: p.batchNumber,
        Expiry: p.expiryDate
      }));
      exportToCSV(formatted, 'DivineSurgicals_InventoryMaster.csv');
    } else if (scope === 'sales') {
      const formatted = data.salesInvoices.map(i => ({
        InvoiceNo: i.invoiceNumber,
        Client: i.customerName,
        Date: i.date,
        Subtotal: i.subtotal,
        TaxesGST: i.totalGst,
        GrandTotal: i.grandTotal,
        Method: i.paymentMethod
      }));
      exportToCSV(formatted, 'DivineSurgicals_SalesRegister.csv');
    } else if (scope === 'purchases') {
      const formatted = data.purchaseOrders.map(po => ({
        PONumber: po.poNumber,
        Supplier: po.supplierName,
        Date: po.orderDate,
        Total: po.totalAmount,
        Taxes: po.totalGst,
        Status: po.status
      }));
      exportToCSV(formatted, 'DivineSurgicals_PurchaseOrders.csv');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Scope switch header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Advanced Reports & Corporate Analytics</h2>
          <p className="text-[11px] text-slate-500">Run compliant GSTR filings, check stock aging, download Excel logs, and verify Silchar branch margins.</p>
        </div>

        <div className="flex gap-2">
          {["daily", "weekly", "monthly", "quarterly"].map((range) => (
            <button
              key={range}
              onClick={() => setReportRange(range as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer
                ${reportRange === range 
                  ? "bg-[#0F4C81] text-white" 
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Main exports grid containing CSV downloads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Export card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-105 shadow-xs flex flex-col justify-between h-48">
          <div>
            <Briefcase size={20} className="text-[#0F4C81]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3">Inventory Valuation Sheet</h3>
            <p className="text-[11px] text-slate-400 mt-1">Get comprehensive stock levels breakdown, warehouse coordinates, and current cash valuation.</p>
          </div>
          
          <button
            onClick={() => triggerCsvDownload('inventory')}
            className="w-full py-2 bg-[#0F4C81] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            Export Inventory CSV
          </button>
        </div>

        {/* Export card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-105 shadow-xs flex flex-col justify-between h-48">
          <div>
            <FileText size={20} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3">Commercial Sales Ledger</h3>
            <p className="text-[11px] text-slate-400 mt-1">GSTR compliant sales receipts. Contains client IDs, detailed IGST/CGST calculations, and dates.</p>
          </div>
          
          <button
            onClick={() => triggerCsvDownload('sales')}
            className="w-full py-2 bg-emerald-600 hover:bg-opacity-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            Export Sales CSV
          </button>
        </div>

        {/* Export card 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-105 shadow-xs flex flex-col justify-between h-48">
          <div>
            <History size={20} className="text-[#4A90E2]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3">Procurement & PO Register</h3>
            <p className="text-[11px] text-slate-400 mt-1">Get records of approved purchase orders, received goods weights, and supplier liabilities status.</p>
          </div>
          
          <button
            onClick={() => triggerCsvDownload('purchases')}
            className="w-full py-2 bg-[#4A90E2] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            Export Purchases CSV
          </button>
        </div>

      </div>

      {/* Critical Expiry aging reports details */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Stock Shelf Aging & Expiry Analysis</h3>
          <span className="text-[10px] text-slate-400">Strict regulatory check for consumables</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Box 1: Expiring within 30 days */}
          <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100">
            <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5 uppercase">
              <AlertTriangle className="text-rose-600" size={14} />
              Expiring in Next 30 Days ({expiringNext30.length})
            </h4>
            <div className="mt-3 space-y-2">
              {expiringNext30.map(p => (
                <div key={p.id} className="text-xs bg-white p-2.5 rounded-lg border border-rose-100 flex justify-between">
                  <span className="font-bold text-slate-750 line-clamp-1">{p.name}</span>
                  <span className="font-mono text-rose-600 font-extrabold shrink-0 border-l pl-2 ml-2">{p.expiryDate}</span>
                </div>
              ))}
              {expiringNext30.length === 0 && (
                <p className="text-[11px] text-slate-450 italic py-2">No surgical equipment expiring this month.</p>
              )}
            </div>
          </div>

          {/* Box 2: Expiring in 31-90 days */}
          <div className="bg-amber-50/55 rounded-xl p-4 border border-amber-105">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase">
              <Calendar className="text-amber-600" size={14} />
              Expiring in 31 - 90 Days ({expiringNext90.length})
            </h4>
            <div className="mt-3 space-y-2">
              {expiringNext90.map(p => (
                <div key={p.id} className="text-xs bg-white p-2.5 rounded-lg border border-amber-100 flex justify-between">
                  <span className="font-bold text-slate-750 line-clamp-1">{p.name}</span>
                  <span className="font-mono text-amber-700 font-bold shrink-0 border-l pl-2 ml-2">{p.expiryDate}</span>
                </div>
              ))}
              {expiringNext90.length === 0 && (
                <p className="text-[11px] text-slate-450 italic py-2">No consumables expiring within next quarter.</p>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
