import React from "react";
import { ERPData, Product } from "../types";
import { formatINR } from "../utils";
import { 
  Package, 
  AlertTriangle, 
  Coins, 
  TrendingUp, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert,
  CalendarCheck,
  Bell
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";

interface DashboardViewProps {
  data: ERPData;
  onNavigate: (tab: string) => void;
}

const COLORS = ['#0F4C81', '#4A90E2', '#28A745', '#FFC107', '#DC3545', '#8E44AD'];

export default function DashboardView({ data, onNavigate }: DashboardViewProps) {
  const [showNotifHistory, setShowNotifHistory] = React.useState(false);
  
  // Calculate executive metrics
  const totalSkuCount = data.products.length;
  
  const totalInventoryValue = data.products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
  
  const lowStockItems = data.products.filter(p => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
  const outOfStockItems = data.products.filter(p => p.currentStock === 0);
  
  const totalSalesThisMonth = data.salesInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  
  const receivedPOs = data.purchaseOrders.filter(po => po.status === 'Received');
  const totalPurchasesThisMonth = receivedPOs.reduce((acc, po) => acc + po.totalAmount, 0);
  
  const pendingSupplierPayments = data.suppliers.reduce((acc, s) => acc + s.outstandingPayments, 0);
  const outstandingCustomerReceivables = data.customers.reduce((acc, c) => acc + c.outstandingPayments, 0);

  // Expiry check
  const today = new Date();
  const expiredItems = data.products.filter(p => new Date(p.expiryDate) < today);
  const nearExpiryItems = data.products.filter(p => {
    const expDate = new Date(p.expiryDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60; // expiring in next 60 days
  });

  // Prepare chart data: Category Distribution
  const categoriesMap: Record<string, { value: number; stock: number }> = {};
  data.products.forEach(p => {
    if (!categoriesMap[p.category]) {
      categoriesMap[p.category] = { value: 0, stock: 0 };
    }
    categoriesMap[p.category].value += p.currentStock * p.purchasePrice;
    categoriesMap[p.category].stock += p.currentStock;
  });

  const categoryChartData = Object.entries(categoriesMap).map(([name, val]) => ({
    name,
    value: Math.round(val.value),
    stock: val.stock
  }));

  // Prepare trend data
  const monthlyTrendData = [
    { name: "Jan", Sales: 145000, Purchases: 110000 },
    { name: "Feb", Sales: 189000, Purchases: 135000 },
    { name: "Mar", Sales: 245000, Purchases: 198000 },
    { name: "Apr", Sales: 210000, Purchases: 140000 },
    { name: "May", Sales: 280000, Purchases: 220000 },
    { name: "Jun", Sales: totalSalesThisMonth ? Math.round(totalSalesThisMonth) : 251000, Purchases: totalPurchasesThisMonth ? Math.round(totalPurchasesThisMonth) : 71000 }
  ];

  const totalNotificationsCount = (outOfStockItems.length > 0 ? 1 : 0) + (expiredItems.length > 0 ? 1 : 0) + (lowStockItems.length > 0 ? 1 : 0);
  const hasNotifications = totalNotificationsCount > 0;

  return (
    <div className="space-y-6">
      
      {/* Executive Header Controls with Integrated Notification Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative">
        <div className="space-y-0.5">
          <h2 className="text-base font-extrabold text-[#0F4C81] tracking-tight">Executive Workspace Insights</h2>
          <p className="text-xs text-slate-400 font-medium leading-none">Diagnostic charts, logistical thresholds, and commercial summaries for Silchar hub.</p>
        </div>

        {/* Dynamic Notification Bell with custom dropdown overlay */}
        <div className="relative self-end sm:self-auto" id="hub-notification-center">
          <button 
            onClick={() => setShowNotifHistory(!showNotifHistory)}
            className={`p-2.5 rounded-xl border transition-all relative flex items-center justify-center cursor-pointer ${showNotifHistory ? "bg-[#0F4C81] text-white border-[#0F4C81]" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"}`}
            title="Logistical system alerts"
          >
            <Bell size={18} className={hasNotifications ? "animate-pulse" : ""} />
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-white">
                {outOfStockItems.length + expiredItems.length + lowStockItems.length}
              </span>
            )}
          </button>

          {showNotifHistory && (
            <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-fade-in divide-y divide-slate-100 font-sans">
              <div className="p-3.5 bg-[#0F4C81] text-white flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-100">Hub Notification Center</span>
                <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                  {outOfStockItems.length + expiredItems.length + lowStockItems.length} Alerts
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                
                {outOfStockItems.length > 0 && (
                  <div className="p-3 text-left space-y-1 bg-red-50/20 hover:bg-red-50/40 transition">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[10.5px]">
                      <ShieldAlert size={12} className="text-rose-600 shrink-0" />
                      <span>Zero Inventory Restock Alert</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      We have <strong className="font-extrabold">{outOfStockItems.length} critical medical items</strong> completely out of stock. Contact Guwahati sub-distributor immediately.
                    </p>
                    <button 
                      onClick={() => {
                        setShowNotifHistory(false);
                        onNavigate('inventory');
                      }}
                      className="text-[9px] font-extrabold text-blue-600 hover:underline pt-0.5 block cursor-pointer"
                    >
                      Restock Items Now →
                    </button>
                  </div>
                )}

                {expiredItems.length > 0 && (
                  <div className="p-3 text-left space-y-1 bg-rose-50/20 hover:bg-rose-50/40 transition">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[10.5px]">
                      <CalendarCheck size={12} className="text-rose-600 shrink-0" />
                      <span>Medical Goods Expired</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      <strong className="font-extrabold">{expiredItems.length} batches</strong> have exceeded safety biological efficacy periods and require immediate hazard containment.
                    </p>
                    <button 
                      onClick={() => {
                        setShowNotifHistory(false);
                        onNavigate('reports');
                      }}
                      className="text-[9px] font-extrabold text-rose-600 hover:underline pt-0.5 block cursor-pointer"
                    >
                      Audit Expired Items →
                    </button>
                  </div>
                )}

                {lowStockItems.length > 0 && (
                  <div className="p-3 text-left space-y-1 bg-amber-50/20 hover:bg-amber-50/40 transition">
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[10.5px]">
                      <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                      <span>Optimal Threshold Alert</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      <strong className="font-extrabold">{lowStockItems.length} products</strong> are sitting below emergency fallback inventory quantities.
                    </p>
                    <button 
                      onClick={() => {
                        setShowNotifHistory(false);
                        onNavigate('inventory');
                      }}
                      className="text-[9px] font-extrabold text-[#0F4C81] hover:underline pt-0.5 block cursor-pointer"
                    >
                      View Low Stock Buffer →
                    </button>
                  </div>
                )}

                {!hasNotifications && (
                  <div className="p-6 text-center text-slate-400 space-y-1">
                    <Bell size={24} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No Pending Alerts</p>
                    <p className="text-[10px]">All medical logistics systems operating within optimal specifications.</p>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Inventory Capital Value</span>
            <p className="text-2xl font-bold text-[#0F4C81]">{formatINR(totalInventoryValue)}</p>
            <p className="text-[10px] text-slate-400 font-medium">{totalSkuCount} Registered medical SKUs</p>
          </div>
          <div className="bg-blue-50 text-[#0F4C81] p-3 rounded-xl">
            <Package size={22} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Monthly Active Sales</span>
            <p className="text-2xl font-bold text-[#28A745]">{formatINR(totalSalesThisMonth)}</p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> Live sales in Cachar valley
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-3 rounded-xl">
            <ArrowUpRight size={22} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Outstanding Customer Receivables</span>
            <p className="text-2xl font-bold text-amber-600">{formatINR(outstandingCustomerReceivables)}</p>
            <p className="text-[10px] text-slate-400 font-medium">Hospital check payments pending</p>
          </div>
          <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
            <Coins size={22} />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Pending Supplier Liabilities</span>
            <p className="text-2xl font-bold text-rose-600">{formatINR(pendingSupplierPayments)}</p>
            <p className="text-[10px] text-slate-400 font-medium">Guwahati & Delhi distributors</p>
          </div>
          <div className="bg-rose-50 text-rose-500 p-3 rounded-xl">
            <ArrowDownLeft size={22} />
          </div>
        </div>

      </div>

      {/* Stock Alerts Quick Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs col-span-1">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} />
              Low Stock Alerts ({lowStockItems.length})
            </h3>
            <button onClick={() => onNavigate('inventory')} className="text-xs text-blue-500 font-medium hover:underline">
              View All
            </button>
          </div>
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">All stocks are above optimal safety buffers.</p>
            ) : (
              lowStockItems.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-700 truncate max-w-[170px]">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Stock: {p.currentStock}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1">Reorder: {p.reorderLevel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiry Alerts Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs col-span-1">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CalendarCheck className="text-rose-500" size={16} />
              Expiry Warning Panel
            </h3>
            <button onClick={() => onNavigate('reports')} className="text-xs text-blue-500 font-medium hover:underline">
              Audit
            </button>
          </div>
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {expiredItems.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-rose-950 truncate max-w-[170px]">{p.name}</p>
                  <p className="text-[10px] text-[#DC3545] font-mono">Batch: {p.batchNumber}</p>
                </div>
                <span className="text-[10px] font-bold text-[#DC3545] bg-rose-100 px-2 py-0.5 rounded">
                  EXPIRED
                </span>
              </div>
            ))}
            {nearExpiryItems.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">{p.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Exp: {p.expiryDate}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-130 px-2 py-0.5 rounded">
                  Near Expiry
                </span>
              </div>
            ))}
            {expiredItems.length === 0 && nearExpiryItems.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No biological goods expiring soon.</p>
            )}
          </div>
        </div>

        {/* Supplier Alert Dues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs col-span-1">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-[#0F4C81]" size={16} />
              Outstanding Supplier Payables
            </h3>
            <button onClick={() => onNavigate('suppliers')} className="text-xs text-blue-500 font-medium hover:underline">
              Pay Dues
            </button>
          </div>
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {data.suppliers.filter(s => s.outstandingPayments > 0).map(s => (
              <div key={s.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#0F4C81]">{s.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{s.contactPerson} ({s.paymentTerms})</p>
                </div>
                <span className="text-xs font-bold text-rose-500">
                  {formatINR(s.outstandingPayments)}
                </span>
              </div>
            ))}
            {data.suppliers.filter(s => s.outstandingPayments > 0).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">All suppliers have zero remaining balance.</p>
            )}
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales & Purchases Trend Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 pb-4 border-b border-slate-50 leading-none">
            Monthly Transactions & Capital Comparison
          </h3>
          <div className="h-72 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4A90E2" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]} />
                <Area type="monotone" dataKey="Sales" stroke="#4A90E2" fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="Purchases" stroke="#0F4C81" fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[#4A90E2]">
              <span className="w-3 h-3 rounded-full bg-[#4A90E2]"></span>
              Sales Revenue
            </div>
            <div className="flex items-center gap-1.5 font-medium text-[#0F4C81]">
              <span className="w-3 h-3 rounded-full bg-[#0F4C81]"></span>
              Supplier Procurement Purchases
            </div>
          </div>
        </div>

        {/* Product Category Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs col-span-1">
          <h3 className="text-sm font-semibold text-slate-800 pb-4 border-b border-slate-50 leading-none">
            Capital Distribution by Category
          </h3>
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, "Capital Locked"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend list */}
          <div className="grid grid-cols-2 gap-2 mt-2 max-h-24 overflow-y-auto text-[10px] text-slate-500">
            {categoryChartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name}</span>
                <span className="font-bold text-slate-700 font-mono ml-auto">({entry.stock})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
