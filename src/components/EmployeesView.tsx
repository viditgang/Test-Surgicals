import React from "react";
import { ERPData, User, UserRole } from "../types";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  UserPlus, 
  UserCheck, 
  Mail, 
  Key, 
  Plus, 
  Trash2, 
  Edit2, 
  Lock, 
  Unlock, 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle,
  Fingerprint
} from "lucide-react";

interface EmployeesViewProps {
  data: ERPData;
  currentUser: User;
  onAddEmployee: (employee: Omit<User, 'id'>) => void;
  onUpdateEmployee: (employee: User) => void;
  onDeleteEmployee: (userId: string) => void;
  onUpdatePermissions: (permissions: Record<string, string[]>) => void;
  onSwitchActiveUser: (user: User) => void;
}

const ALL_ROLES: UserRole[] = ["Owner", "Manager", "Accountant", "Sales Executive"];

const MODULE_LABELS: Record<string, string> = {
  "dashboard": "Executive Dashboard",
  "inventory": "Inventory Master",
  "purchases": "Purchase & POs",
  "sales": "Sales & Billing (POS)",
  "suppliers": "Suppliers Accounts",
  "customers": "Customers Directory",
  "finance": "Accounts & GST Ledger",
  "reports": "Audits & Exports",
  "employees": "Employee & Access Controls",
  "ai-assistant": "Intelligent AI Assistant",
  "settings": "Sync & Config Settings"
};

export default function EmployeesView({
  data,
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdatePermissions,
  onSwitchActiveUser
}: EmployeesViewProps) {
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  
  // Modals / expansion pane states
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Form states
  const [formDataName, setFormDataName] = React.useState("");
  const [formDataEmail, setFormDataEmail] = React.useState("");
  const [formDataUsername, setFormDataUsername] = React.useState("");
  const [formDataRole, setFormDataRole] = React.useState<UserRole>("Sales Executive");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Get active role permissions dictionary safely
  const rolePermissions = data.rolePermissions || {
    "Owner": ["dashboard", "inventory", "purchases", "sales", "suppliers", "customers", "finance", "reports", "employees", "ai-assistant", "settings"],
    "Manager": ["dashboard", "inventory", "purchases", "suppliers", "customers", "reports", "ai-assistant"],
    "Accountant": ["dashboard", "purchases", "sales", "suppliers", "customers", "finance", "reports", "ai-assistant"],
    "Sales Executive": ["dashboard", "inventory", "sales", "customers", "ai-assistant"]
  };

  const handleTogglePermission = (role: string, moduleKey: string) => {
    // Only Owners can mutate security configuration parameters
    if (currentUser.role !== "Owner") {
      showToast("❌ Permission Denied: Only users with 'Owner' clearance can rewrite system access policy.");
      return;
    }

    // Owner role must always retain access to Owner dashboard & Employees view to avoid locking themselves out
    if (role === "Owner" && (moduleKey === "employees" || moduleKey === "settings")) {
      showToast("⚠️ Security Constraint: Owner must retain system configuration permission.");
      return;
    }

    const currentRolePerms = rolePermissions[role] || [];
    let updatedPerms: string[];

    if (currentRolePerms.includes(moduleKey)) {
      updatedPerms = currentRolePerms.filter(m => m !== moduleKey);
    } else {
      updatedPerms = [...currentRolePerms, moduleKey];
    }

    const newPermissions = {
      ...rolePermissions,
      [role]: updatedPerms
    };

    onUpdatePermissions(newPermissions);
    showToast(`Updated access scope: '${MODULE_LABELS[moduleKey]}' toggled for ${role} role.`);
  };

  const handleOpenAddForm = () => {
    setEditingUser(null);
    setFormDataName("");
    setFormDataEmail("");
    setFormDataUsername("");
    setFormDataRole("Sales Executive");
    setShowAddForm(true);
  };

  const handleOpenEditForm = (u: User) => {
    setEditingUser(u);
    setFormDataName(u.name);
    setFormDataEmail(u.email);
    setFormDataUsername(u.username);
    setFormDataRole(u.role);
    setShowAddForm(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDataName.trim() || !formDataUsername.trim() || !formDataEmail.trim()) {
      alert("Please complete name, username, and email fields.");
      return;
    }

    // Check username duplication
    const duplicate = data.users.some(
      u => u.username.toLowerCase() === formDataUsername.trim().toLowerCase() && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      alert(`The username '${formDataUsername}' is already taken. Please choose a unique work alias.`);
      return;
    }

    if (editingUser) {
      // Update employee record
      onUpdateEmployee({
        id: editingUser.id,
        name: formDataName.trim(),
        username: formDataUsername.trim().toLowerCase(),
        role: formDataRole,
        email: formDataEmail.trim()
      });
      showToast(`Successfully updated profile of '${formDataName.trim()}'.`);
    } else {
      // Create fresh employee
      onAddEmployee({
        name: formDataName.trim(),
        username: formDataUsername.trim().toLowerCase(),
        role: formDataRole,
        email: formDataEmail.trim()
      });
      showToast(`Issued credentials and registered '${formDataName.trim()}' successfully.`);
    }

    setShowAddForm(false);
  };

  const handleDeleteStaff = (u: User) => {
    if (u.id === currentUser.id) {
      alert("Self-Destruct Blocked: You cannot delete your own active credential session.");
      return;
    }
    if (u.id === "user-owner") {
      alert("System Protection Triggered: Principal root 'Owner' profile cannot be deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to permanently revoke surgical network access of ${u.name} (${u.role})?`)) {
      onDeleteEmployee(u.id);
      showToast(`Revoked credentials for ${u.name}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in animate-bounce">
          <Sparkles size={14} className="text-yellow-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-linear-to-r from-[#0F4C81] to-[#1D74C1] text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Shield size={20} className="text-[#DCEEFF]" />
              Staff Registry & Access Clearance Council
            </h2>
            <p className="text-xs text-blue-105 max-w-xl">
              Audit corporate surgical terminal permission nodes, register clinical operations staff, allocate role-based dashboard filters, and grant instant clearances for Dibrugarh & Silchar networks.
            </p>
          </div>
          <button 
            onClick={handleOpenAddForm}
            className="self-start px-4 py-2.5 bg-white text-[#0F4C81] text-xs font-bold rounded-xl shadow-lg hover:bg-blue-50 transition transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={14} />
            Provision Staff Identity
          </button>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right pointer-events-none"></div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Authorized Personnel</span>
            <p className="text-2xl font-black text-[#0F4C81]">{data.users.length}</p>
            <span className="text-[9px] text-[#28A745] font-bold block">✓ All nodes active & synced</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0F4C81]">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Access Control Engine</span>
            <p className="text-sm font-black text-slate-700">Role-Based Policy Node</p>
            <span className="text-[9px] text-slate-500 font-semibold block">Grid Matrix: 11 active modules</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <Fingerprint size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Session Scope</span>
            <p className="text-xs font-black text-slate-800 truncate max-w-[180px]">{currentUser.name}</p>
            <span className="text-[9px] text-orange-500 font-bold block bg-orange-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
              Role: {currentUser.role}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: STAFF REGISTRY CONTROL LIST (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Clinical & Operations Staff List</h3>
              <p className="text-[10px] text-slate-400">Total verified biometric accounts registered to Divine database.</p>
            </div>
            <span className="text-[10px] text-slate-405 font-mono text-xs">
              Count: <span className="font-bold text-[#0F4C81]">{data.users.length}</span>
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {data.users.map((user) => {
              const isActiveUser = user.id === currentUser.id;
              return (
                <div 
                  key={user.id} 
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
                    ${isActiveUser 
                      ? "bg-blue-50/60 border-blue-200/80 shadow-xs" 
                      : "bg-[#FAFBFD]/60 hover:bg-slate-50 border-slate-150"
                    }
                  `}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">{user.name}</p>
                      
                      {isActiveUser ? (
                        <span className="text-[8px] bg-[#0F4C81] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Logged In
                        </span>
                      ) : (
                        <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          @{user.username}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-slate-400 font-semibold">
                      <span className="text-[#0F4C81] font-bold">{user.role}</span>
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    
                    {/* Role simulator session switch */}
                    {!isActiveUser && currentUser.role === "Owner" && (
                      <button
                        onClick={() => {
                          onSwitchActiveUser(user);
                          showToast(`Logged into workstation of: ${user.name} (${user.role})`);
                        }}
                        className="px-2.5 py-1.5 bg-blue-55 text-xs text-[#0F4C81] hover:bg-blue-100/80 rounded-lg font-bold border border-blue-100 transition cursor-pointer"
                        title="Simulate workstation terminal for this role"
                      >
                        Launch Station
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditForm(user)}
                      className="p-1 px-2 text-slate-605 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                      title="Edit Staff Information"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteStaff(user)}
                      className="p-1 px-2 text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg transition"
                      title="De-authorize and Revoke Access"
                    >
                      <Trash2 size={13} />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ACCESS CONTROL POLICY GRID (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Key size={14} className="text-yellow-600" />
              User Level Access Policy Matrix
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Define which roles can browse or commit actions on specific modules. Toggles update system routes in real-time.
            </p>
          </div>

          <div className="border border-slate-150 rounded-xl overflow-hidden bg-white text-[11px]">
            {/* Table Matrix Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2.5 grid grid-cols-12 gap-1 font-bold text-slate-500 uppercase text-[9px] tracking-wider text-center">
              <span className="col-span-6 text-left">Module Segment</span>
              <span className="col-span-2" title="Owner">OWN</span>
              <span className="col-span-2" title="Manager">MGR</span>
              <span className="col-span-2" title="Accountant">ACC</span>
            </div>

            {/* Table Matrix Rows */}
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {Object.entries(MODULE_LABELS).map(([moduleKey, label]) => {
                const ownerPermitted = (rolePermissions["Owner"] || []).includes(moduleKey);
                const managerPermitted = (rolePermissions["Manager"] || []).includes(moduleKey);
                const accountantPermitted = (rolePermissions["Accountant"] || []).includes(moduleKey);

                return (
                  <div key={moduleKey} className="px-3 py-2 grid grid-cols-12 gap-1 text-slate-700 items-center hover:bg-slate-50/50">
                    <span className="col-span-6 font-bold text-slate-750 text-left truncate" title={label}>
                      {label}
                    </span>

                    {/* Owner Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <input 
                        type="checkbox"
                        checked={ownerPermitted}
                        onChange={() => handleTogglePermission("Owner", moduleKey)}
                        disabled={currentUser.role !== "Owner"}
                        className="h-4 w-4 text-[#0F4C81] focus:ring-[#0F4C81] border-slate-300 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* Manager Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <input 
                        type="checkbox"
                        checked={managerPermitted}
                        onChange={() => handleTogglePermission("Manager", moduleKey)}
                        disabled={currentUser.role !== "Owner"}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-slate-300 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* Accountant Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <input 
                        type="checkbox"
                        checked={accountantPermitted}
                        onChange={() => handleTogglePermission("Accountant", moduleKey)}
                        disabled={currentUser.role !== "Owner"}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-600 border-slate-300 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Note */}
            <div className="bg-slate-50 p-3 border-t border-slate-150 text-[9px] text-slate-500 leading-relaxed font-semibold flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Policy Guide:</strong> *Owner overrides are permanently enforced. Managers control supply chains. Accountants control billing. Sales Executives are limited to POS checkout and Customer registrations. Only Owners can change checkmarks.
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* PROVISIONING / CREDENTIAL EDIT MASTER PANEL DRAWER SCREEN */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 font-sans">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-[#0F4C81]">
                <Shield size={18} />
                <h3 className="text-sm font-bold">
                  {editingUser ? "Edit Active Security Credentials" : "Provision New Staff Identity Node"}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="mt-4 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Employee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Partha Pratim Ray"
                  value={formDataName}
                  onChange={(e) => setFormDataName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username Alias</label>
                  <input
                    type="text"
                    placeholder="e.g. partha"
                    value={formDataUsername}
                    onChange={(e) => setFormDataUsername(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Access Role</label>
                  <select
                    value={formDataRole}
                    onChange={(e) => setFormDataRole(e.target.value as UserRole)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold bg-white"
                  >
                    <option value="Owner">👑 Owner (Full Root)</option>
                    <option value="Manager">📦 Store Manager</option>
                    <option value="Accountant">💰 Financial Accountant</option>
                    <option value="Sales Executive">📈 Sales Executive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. partha@divinesurgicals.com"
                  value={formDataEmail}
                  onChange={(e) => setFormDataEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  required
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 leading-normal border border-slate-150">
                ⭐ <strong>Access Scope:</strong> In Divine Surgicals ERP node, newly provisioned staff are instantly catalogued. Clearances propagate automatically upon active station relaunch.
              </div>

              <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-semibold cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F4C81] text-white hover:bg-opacity-95 font-bold rounded-xl shadow-xs"
                >
                  {editingUser ? "Apply Security Patch" : "Authorize Registry"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
