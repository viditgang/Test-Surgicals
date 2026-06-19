import React from "react";
import { ERPData, FinancialRecord, User } from "../types";
import { formatINR } from "../utils";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Calendar, 
  Filter, 
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Check
} from "lucide-react";

interface AccountsViewProps {
  data: ERPData;
  currentUser: User;
  onAddFinancialRecord: (record: Omit<FinancialRecord, 'id'>) => void;
}

export default function AccountsView({ data, currentUser, onAddFinancialRecord }: AccountsViewProps) {
  const [showAddTransactionModal, setShowAddTransactionModal] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState("All");
  const [filterType, setFilterType] = React.useState<"All" | "Income" | "Expense">("All");

  // Form states
  const [recType, setRecType] = React.useState<"Income" | "Expense">("Income");
  const [recCategory, setRecCategory] = React.useState("Sales Revenue");
  const [recAmount, setRecAmount] = React.useState(1000);
  const [recGstImpact, setRecGstImpact] = React.useState(180);
  const [recNotes, setRecNotes] = React.useState("");

  // Calculate Aggregations
  const totalIncome = data.financialRecords
    .filter(r => r.type === "Income")
    .reduce((acc, r) => acc + r.amount, 0);

  const totalExpense = data.financialRecords
    .filter(r => r.type === "Expense")
    .reduce((acc, r) => acc + r.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  const totalGstLiability = data.financialRecords.reduce((acc, r) => {
    // Income means outward GST we collected (Liability to pay government)
    // Expense means inward GST input credit we paid to suppliers (We deduct this)
    if (r.type === "Income") {
      return acc + r.gstImpact;
    } else {
      return acc - r.gstImpact;
    }
  }, 0);

  const filteredRecords = data.financialRecords.filter(r => {
    const matchesType = filterType === "All" || r.type === filterType;
    const matchesCategory = filterCategory === "All" || r.category === filterCategory;
    return matchesType && matchesCategory;
  });

  const categories = ["All", ...new Set(data.financialRecords.map(r => r.category))];

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recAmount <= 0) {
      alert("Amount must be positive!");
      return;
    }

    onAddFinancialRecord({
      type: recType,
      category: recCategory,
      amount: Number(recAmount),
      gstImpact: Number(recGstImpact),
      date: new Date().toISOString().split('T')[0],
      description: recNotes || `${recCategory} transactional log`
    });

    setShowAddTransactionModal(false);
    setRecNotes("");
    setRecAmount(1000);
    setRecGstImpact(180);
  };

  return (
    <div className="space-y-6">
      
      {/* Financial KPIs row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Income Cashbox</span>
            <p className="text-xl font-bold text-emerald-600">{formatINR(totalIncome)}</p>
            <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
              <ArrowUpRight size={10} className="text-emerald-500" /> Sales collections
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-2.5 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Disbursed Expenses</span>
            <p className="text-xl font-bold text-rose-500">{formatINR(totalExpense)}</p>
            <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
              <ArrowDownRight size={10} className="text-rose-500" /> Suppliers & Rent
            </span>
          </div>
          <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Operational Profit Margin</span>
            <p className={`text-xl font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {formatINR(netCashFlow)}
            </p>
            <span className="text-[9px] text-slate-400 font-semibold">Net corporate margins</span>
          </div>
          <div className="bg-cyan-50 text-cyan-700 p-2.5 rounded-xl">
            <Coins size={22} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Net GST Liability (Out-In)</span>
            <p className={`text-xl font-bold ${totalGstLiability >= 0 ? "text-slate-700" : "text-emerald-600"}`}>
              {formatINR(Math.abs(totalGstLiability))}
            </p>
            <span className="text-[9px] text-slate-400 font-bold">
              {totalGstLiability >= 0 ? "To pay to center (GSTR-1)" : "Input Tax Credit buffer"}
            </span>
          </div>
          <div className="bg-blue-50 text-[#0F4C81] p-2.5 rounded-xl">
            <Receipt size={22} />
          </div>
        </div>

      </div>

      {/* Audit ledger filter bar & Add action */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Filter size={14} />
            <span>Scope:</span>
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="border border-slate-250 rounded px-2 py-1 text-slate-700 bg-white"
            >
              <option value="All">All Transactions</option>
              <option value="Income">Income Only</option>
              <option value="Expense">Expense Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <span>Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-slate-250 rounded px-2 py-1 text-slate-700 bg-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        <button
          onClick={() => setShowAddTransactionModal(true)}
          className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl hover:bg-opacity-95 transition cursor-pointer flex items-center gap-1"
        >
          <Plus size={14} />
          Log Manual Expense/Income
        </button>

      </div>

      {/* Main ledger list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Corporate Cash Ledger & GST Audits</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-medium text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Tx Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Financial Description</th>
                <th className="py-3 px-4 text-right">Tax Impact (GST)</th>
                <th className="py-3 px-4 text-right">Adjusted Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">{r.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded
                      ${r.type === 'Income' 
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                      }
                    `}>
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-semibold">
                    {r.description}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                    ₹{r.gstImpact.toFixed(2)}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-extrabold font-mono
                    ${r.type === 'Income' ? "text-emerald-600" : "text-rose-600"}
                  `}>
                    {r.type === 'Income' ? '+' : '-'}{formatINR(r.amount)}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                    No transactions matched search constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD CUSTOM MANUAL TRANSACTION */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100">
              Log Cash transaction
            </h3>

            <form onSubmit={handleAddTransactionSubmit} className="mt-4 space-y-4">
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setRecType("Income"); setRecCategory("Sales Revenue"); }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition
                    ${recType === 'Income' 
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                      : "border-slate-200 text-slate-500"
                    }
                  `}
                >
                  Income Inward
                </button>
                <button
                  type="button"
                  onClick={() => { setRecType("Expense"); setRecCategory("Salaries"); }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition
                    ${recType === 'Expense' 
                      ? "bg-rose-50 border-rose-500 text-rose-800" 
                      : "border-slate-200 text-slate-500"
                    }
                  `}
                >
                  Expense Outward
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Account Category</label>
                {recType === 'Income' ? (
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  >
                    <option value="Sales Revenue">Sales Revenue</option>
                    <option value="Hospitality Consultance">Hospitality Consultance</option>
                    <option value="Other Inward Cash">Other Inward Cash</option>
                  </select>
                ) : (
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  >
                    <option value="Salaries">Salaries (Silchar team)</option>
                    <option value="Rent">Showroom Rent</option>
                    <option value="Utilities">Showroom Electricity / Broadband</option>
                    <option value="Other Logistics">Other Logistics</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Net Amount (₹)</label>
                  <input
                    type="number"
                    value={recAmount}
                    onChange={(e) => setRecAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-semibold text-[#0F4C81]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">GST Impact (₹)</label>
                  <input
                    type="number"
                    value={recGstImpact}
                    onChange={(e) => setRecGstImpact(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">Transaction Description notes</label>
                <textarea
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="SBI check details, regional bills etc."
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs h-16 resize-none"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-550 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-semibold hover:bg-opacity-95 transition cursor-pointer"
                >
                  Authorized Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
