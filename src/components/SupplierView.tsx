import React from "react";
import { ERPData, Supplier, SupplierLedgerEntry, User } from "../types";
import { formatINR } from "../utils";
import { 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  UserPlus, 
  CreditCard,
  History,
  TrendingDown,
  Star,
  CheckCircle2,
  Lock,
  Plus,
  FileSpreadsheet
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

interface SupplierViewProps {
  data: ERPData;
  currentUser: User;
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'outstandingPayments' | 'performanceScore' | 'ledger' | 'preferred'>) => void;
  onReleasePayment: (supplierId: string, amount: number, notes: string) => void;
  onBulkImport?: (items: any[]) => void;
}

export default function SupplierView({ data, currentUser, onAddSupplier, onReleasePayment, onBulkImport }: SupplierViewProps) {
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>("");
  const [showAddSupplierModal, setShowAddSupplierModal] = React.useState(false);
  const [showReleasePaymentModal, setShowReleasePaymentModal] = React.useState(false);
  const [showImportWidget, setShowImportWidget] = React.useState(false);

  // Form states
  const [newName, setNewName] = React.useState("");
  const [newContact, setNewContact] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newGst, setNewGst] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newTerms, setNewTerms] = React.useState("Net 30");

  const [paymentAmount, setPaymentAmount] = React.useState(5000);
  const [paymentNotes, setPaymentNotes] = React.useState("");

  const selectedSupplier = data.suppliers.find(s => s.id === selectedSupplierId) || data.suppliers[0];

  React.useEffect(() => {
    if (!selectedSupplierId && data.suppliers.length > 0) {
      setSelectedSupplierId(data.suppliers[0].id);
    }
  }, [data.suppliers, selectedSupplierId]);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert("Name and phone are required!");
      return;
    }

    onAddSupplier({
      name: newName,
      contactPerson: newContact,
      mobileNumber: newPhone,
      email: newEmail,
      gstNumber: newGst || "18AABCS0000Z0ZP",
      address: newAddress,
      paymentTerms: newTerms
    });

    // Reset Form
    setShowAddSupplierModal(false);
    setNewName("");
    setNewContact("");
    setNewPhone("");
    setNewEmail("");
    setNewGst("");
    setNewAddress("");
  };

  const handleReleasePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (paymentAmount <= 0) {
      alert("Payment amount must be greater than zero");
      return;
    }
    if (paymentAmount > selectedSupplier.outstandingPayments) {
      alert("Warning: Payment exceeds outstanding balance limit.");
    }

    onReleasePayment(selectedSupplier.id, paymentAmount, paymentNotes || "Released outstanding credit balance.");

    setShowReleasePaymentModal(false);
    setPaymentAmount(5000);
    setPaymentNotes("");
  };

  return (
    <div className="space-y-6">
      
      {/* Supplier Hub Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Surgical Supplier & Logistics Network</h2>
          <p className="text-[11px] text-slate-500">Manage manufacturing hubs across Guwahati, Delhi, and surgical supply lines.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportWidget(!showImportWidget)}
            className={`px-4 py-2 border text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 ${showImportWidget ? 'bg-slate-100 border-slate-305 text-slate-705' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel / CSV Import</span>
          </button>
          <button
            onClick={() => setShowReleasePaymentModal(true)}
            className="px-4 py-2 bg-[#4A90E2] text-white text-xs font-semibold rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <CreditCard size={14} />
            Settle Supplier Payment
          </button>
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-semibold rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            Add Supplier Group
          </button>
        </div>
      </div>

      {showImportWidget && onBulkImport && (
        <ExcelImportWidget 
          type="suppliers" 
          onImport={(items) => {
            onBulkImport(items);
            setShowImportWidget(false);
          }} 
        />
      )}

      {/* Grid split of Supplier List vs Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SUPPLIER LIST REGISTER */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden h-max">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Manufacturer Directory</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
              {data.suppliers.length} Total
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {data.suppliers.map((s) => {
              const isActive = selectedSupplier && s.id === selectedSupplier.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSupplierId(s.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition flex items-start gap-3 border-l-4
                    ${isActive 
                      ? "bg-[#DCEEFF]/55 border-[#0F4C81]" 
                      : "border-transparent"
                    }
                  `}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{s.name}</p>
                      {s.preferred && (
                        <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-medium">Rep: {s.contactPerson}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Terms: {s.paymentTerms}</span>
                      <span className="text-slate-600 font-bold whitespace-nowrap">
                        Outstanding: {formatINR(s.outstandingPayments)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS, SCORES AND LEDGER */}
        {selectedSupplier ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Supplier Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#0F4C81]">{selectedSupplier.name}</h3>
                    {selectedSupplier.preferred && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Award size={10} className="fill-amber-800 text-amber-100" />
                        PRE_SOURCED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Active Distributor • GSTIN: <span className="font-mono text-slate-700 font-bold">{selectedSupplier.gstNumber}</span></p>
                </div>

                {/* Score badge */}
                <div className="bg-[#F8FBFF] border border-blue-100 px-4 py-2 rounded-xl text-center shadow-xs self-stretch sm:self-auto flex sm:flex-col items-center justify-around">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Reliability Score</span>
                  <div className="text-lg font-bold text-[#0F4C81] flex items-center gap-1">
                    {selectedSupplier.performanceScore} <span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              {/* Grid with info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span className="font-medium">Direct Line: {selectedSupplier.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span className="font-medium truncate block">Email: {selectedSupplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span className="font-medium">Warehouse: {selectedSupplier.address}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                  <h4 className="font-semibold text-slate-700 text-xs">Payment Terms & Liabilities</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-550 text-[11px]">Contract Terms:</span>
                    <span className="font-bold text-slate-700">{selectedSupplier.paymentTerms}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                    <span className="text-slate-550 text-[11px]">Owed Balance Due:</span>
                    <span className="font-extrabold text-rose-600 font-mono">{formatINR(selectedSupplier.outstandingPayments)}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Audit Ledger List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={14} className="text-[#0F4C81]" />
                  Supplier Ledger Audit Trail
                </h3>
                <span className="text-[10px] text-slate-400">Chronological history</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-medium text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Document Ref</th>
                      <th className="py-3 px-4">Transaction Details</th>
                      <th className="py-3 px-4 text-right">Credit/Debit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {selectedSupplier.ledger && selectedSupplier.ledger.length > 0 ? (
                      selectedSupplier.ledger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded
                              ${entry.type === 'Purchase Invoice' 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"}
                            `}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-[#0F4C81]">{entry.referenceId}</td>
                          <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={entry.description}>{entry.description}</td>
                          <td className={`py-3 px-4 text-right font-bold font-mono
                            ${entry.type === 'Purchase Invoice' ? "text-rose-600" : "text-emerald-600"}
                          `}>
                            {entry.type === 'Purchase Invoice' ? '+' : '-'}{formatINR(entry.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium text-xs">
                          No transactions recorded in ledger yet. Generate a Purchase Order first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-12 text-slate-400 font-medium">
            No active distributors found. Create catalog suppliers.
          </div>
        )}

      </div>

      {/* MODAL 1: ADD NEW SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100 flex items-center gap-1">
              Add New Sourcing Partner
            </h3>

            <form onSubmit={handleCreateSupplier} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier / Company Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Eastern Surgical Instruments Ltd"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contact Person</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="e.g. Anand Sharma"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9435055667"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. contact@easternsurgical.com"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GSTIN India</label>
                <input
                  type="text"
                  value={newGst}
                  onChange={(e) => setNewGst(e.target.value)}
                  placeholder="e.g. 18AAAFE1214D1Z2"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Office / Factory Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Near Bypass, Guwahati, Assam"
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Procurement Terms</label>
                <select
                  value={newTerms}
                  onChange={(e) => setNewTerms(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white"
                >
                  <option value="COD">Cash On Delivery (COD)</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-semibold hover:bg-opacity-90 transition cursor-pointer"
                >
                  Create Partner
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RELEASE SUPPLIER PAYMENT */}
      {showReleasePaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <CreditCard size={18} />
              Commit Released Payment Ledger Entry
            </h3>

            <p className="text-[11px] text-slate-500 mt-2">
              Recording a payment release to <strong>{selectedSupplier.name}</strong> will deduct their outstanding payable balance in the audit index.
            </p>

            <form onSubmit={handleReleasePaymentSubmit} className="mt-4 space-y-4">
              
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Debt Level</span>
                <span className="text-sm font-extrabold text-rose-600 font-mono">{formatINR(selectedSupplier.outstandingPayments)}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Released Settlement Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedSupplier.outstandingPayments || 1000000}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F4C81] font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transaction / Cheque / UPI Reference</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. SBI Chq #901239 / UPI Ref #4012"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReleasePaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-opacity-90 transition cursor-pointer"
                >
                  Confirm Ledger Settlement
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
