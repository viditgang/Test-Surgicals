import React from "react";
import { ERPData, Customer, User } from "../types";
import { formatINR } from "../utils";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search,
  Check,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";
import ExcelImportWidget from "./ExcelImportWidget";

interface CustomerViewProps {
  data: ERPData;
  currentUser: User;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'outstandingPayments' | 'lifetimeValue'>) => void;
  onAdjustCredit: (customerId: string, newLimit: number) => void;
  onBulkImport?: (items: any[]) => void;
}

export default function CustomerView({ data, currentUser, onAddCustomer, onAdjustCredit, onBulkImport }: CustomerViewProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showAddCustomerModal, setShowAddCustomerModal] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [showImportWidget, setShowImportWidget] = React.useState(false);

  // Create form states
  const [newName, setNewName] = React.useState("");
  const [newMobile, setNewMobile] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newGst, setNewGst] = React.useState("");
  const [newCreditLimit, setNewCreditLimit] = React.useState(200000);

  const selectedCustomer = data.customers.find(c => c.id === selectedCustomerId) || data.customers[0];

  React.useEffect(() => {
    if (!selectedCustomerId && data.customers.length > 0) {
      setSelectedCustomerId(data.customers[0].id);
    }
  }, [data.customers, selectedCustomerId]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newMobile) {
      alert("Name and mobile are required");
      return;
    }

    onAddCustomer({
      name: newName,
      mobile: newMobile,
      email: newEmail,
      address: newAddress,
      gstNumber: newGst || "18AAAGS000000ZP",
      creditLimit: Number(newCreditLimit)
    });

    setShowAddCustomerModal(false);
    setNewName("");
    setNewMobile("");
    setNewEmail("");
    setNewAddress("");
    setNewGst("");
    setNewCreditLimit(200000);
  };

  const handleSlideCredit = (val: number) => {
    if (!selectedCustomer) return;
    onAdjustCredit(selectedCustomer.id, val);
  };

  const filteredCustomers = data.customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Hospital Name, Mobile, Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81] text-xs font-medium"
          />
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
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-semibold rounded-xl hover:bg-opacity-95 transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} />
            Register Medical Client
          </button>
        </div>
      </div>

      {showImportWidget && onBulkImport && (
        <ExcelImportWidget 
          type="customers" 
          onImport={(items) => {
            onBulkImport(items);
            setShowImportWidget(false);
          }} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Customer List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden h-max">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hospitals & Clinics</h3>
          </div>

          <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
            {filteredCustomers.map(c => {
              const isSelected = selectedCustomer && c.id === selectedCustomer.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition border-l-4 flex items-start gap-3
                    ${isSelected 
                      ? "bg-[#DCEEFF]/50 border-[#0F4C81]" 
                      : "border-transparent"
                    }
                  `}
                >
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0 text-slate-500">
                    <Building2 size={16} />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">GSTIN: {c.gstNumber || "Walk-In"}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span>Limit: {formatINR(c.creditLimit)}</span>
                      <span className="text-slate-700 font-extrabold font-mono">
                        Due: {formatINR(c.outstandingPayments)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Details Pane detailing CLTV, credit adjustments, and history */}
        {selectedCustomer ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Core statistics */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0F4C81]">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500">Medical Client • Facility ID: <span className="font-mono text-slate-700 font-bold">{selectedCustomer.id}</span></p>
                </div>

                <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-center self-stretch sm:self-auto flex items-center gap-3">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Lifetime Value (CLTV)</span>
                    <span className="text-lg font-bold text-emerald-700 font-mono">{formatINR(selectedCustomer.lifetimeValue)}</span>
                  </div>
                  <TrendingUp size={24} className="text-emerald-500" />
                </div>
              </div>

              {/* Grid block containing contacts & address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 font-medium">
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>Mobile/WhatsApp: {selectedCustomer.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate block">Email: {selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>Primary Dispatch: {selectedCustomer.address}</span>
                  </div>
                </div>

                {/* SLIDER CREDIT ALLOCATOR */}
                <div className="bg-[#F8FBFF] p-4 rounded-xl border border-blue-100 space-y-3">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0F4C81]" />
                    Client Credit Allocator
                  </h4>
                  
                  <div className="flex justify-between items-center text-[11px] text-slate-550">
                    <span>Outstanding Due:</span>
                    <span className="font-bold text-rose-600 font-mono">{formatINR(selectedCustomer.outstandingPayments)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-[#0F4C81]">
                      <span>Approved Credit Cap:</span>
                      <span className="font-mono">{formatINR(selectedCustomer.creditLimit)}</span>
                    </div>
                    
                    <input
                      type="range"
                      min="50000"
                      max="1000000"
                      step="50000"
                      value={selectedCustomer.creditLimit}
                      onChange={(e) => handleSlideCredit(Number(e.target.value))}
                      className="w-full accent-[#0F4C81] cursor-col-resize h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                    <span className="text-[9px] text-slate-400 block text-right">Drag range slider to re-adjust caps instantly</span>
                  </div>

                </div>

              </div>

            </div>

            {/* Simulated Hospital Ledger list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historical Order Dispatches</h3>
              </div>
              <div className="p-4 text-center">
                <div className="bg-slate-50 p-6 rounded-xl text-xs text-slate-420 font-medium">
                  We have successfully completed all direct consignments to <strong>{selectedCustomer.name}</strong>. Invoice statements are auto-compiled on the "Sales & Billing" panel for dynamic PDF export.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-50/50 border border-dashed border-slate-200 text-slate-400 font-medium rounded-2xl flex items-center justify-center p-12">
            Add medical facility to proceed with outstanding trackers.
          </div>
        )}

      </div>

      {/* MODAL: REGISTER MEDICAL CLIENT */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h3 className="text-sm font-bold text-[#0F4C81] pb-3 border-b border-slate-100">
              Register New Medical Client
            </h3>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Hospital / Institution Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Silchar Red Cross Hospital"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                  <input
                    type="text"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="e.g. 9435"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GSTIN Number</label>
                  <input
                    type="text"
                    value={newGst}
                    onChange={(e) => setNewGst(e.target.value)}
                    placeholder="e.g. 18AAAH"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. billing@smch.gov"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dispatch Street Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Ghungoor, Silchar, Assam"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opening Credit Limit (₹)</label>
                <input
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-[#0F4C81]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] text-white rounded-xl text-xs font-semibold hover:bg-opacity-90 transition cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
