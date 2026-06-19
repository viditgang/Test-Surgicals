import React from "react";
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Users, 
  UsersRound, 
  FileSpreadsheet, 
  Bot, 
  Settings, 
  ArrowDownToLine, 
  Coins, 
  ShoppingBag,
  Bell,
  Stethoscope,
  ShieldCheck,
  X,
  Cloud,
  LogOut,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { User, SyncStatus } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lowStockCount: number;
  expiringSoonCount: number;
  isOpenOnMobile?: boolean;
  onCloseMobileMenu?: () => void;
  appLogo?: string;
  appName?: string;
  // Dynamic sync, identity & session controls
  currentUser?: User;
  onLogout?: () => void;
  syncStatus?: SyncStatus;
  triggerSync?: (source: 'OneDrive' | 'Google Sheets') => void;
  isSyncing?: boolean;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  lowStockCount, 
  expiringSoonCount,
  isOpenOnMobile = false,
  onCloseMobileMenu,
  appLogo,
  appName = "Divine Surgicals",
  currentUser,
  onLogout,
  syncStatus,
  triggerSync,
  isSyncing = false
}: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventory Master", icon: Package, badge: lowStockCount },
    { id: "purchases", label: "Purchase & POs", icon: ShoppingBag },
    { id: "sales", label: "Sales & Billing", icon: TrendingUp },
    { id: "suppliers", label: "Suppliers", icon: UsersRound },
    { id: "customers", label: "Customers", icon: Users },
    { id: "finance", label: "Accounts & GST", icon: Coins },
    { id: "reports", label: "Audits & Exports", icon: FileSpreadsheet, badge: expiringSoonCount ? "Expiry!" : undefined },
    { id: "employees", label: "Employee & Access", icon: ShieldCheck },
    { id: "ai-assistant", label: "Intelligent AI AI", icon: Bot, isAi: true },
    { id: "settings", label: "Sync & Settings", icon: Settings }
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  const sidebarContent = (
    <div className="w-64 bg-[#0F4C81] text-white flex flex-col h-full shrink-0 select-none border-r border-[#1E3A8A]/30">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-white/15 p-2 rounded-xl shrink-0 flex items-center justify-center w-9 h-9">
            {appLogo ? (
              <img src={appLogo} alt="Corporate logo" className="w-full h-full object-contain select-none" referrerPolicy="no-referrer" />
            ) : (
              <Stethoscope size={18} className="text-[#DCEEFF]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[9px] tracking-widest text-[#DCEEFF] uppercase block leading-none">Divine Hub</span>
            <p className="text-[13px] font-extrabold tracking-tight truncate leading-tight mt-0.5" title={appName}>
              {appName}
            </p>
          </div>
        </div>

        {/* Close Button on mobile drawers */}
        {onCloseMobileMenu && (
          <button 
            onClick={onCloseMobileMenu}
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition cursor-pointer"
            title="Collapse menu panels"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left
                ${isActive 
                  ? "bg-[#4A90E2] text-white shadow-md shadow-blue-950/20" 
                  : item.isAi
                  ? "bg-gradient-to-r from-cyan-600/50 to-blue-600/40 text-cyan-100 hover:bg-white/5 border border-cyan-500/30"
                  : "text-white/85 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={16} className={isActive ? "text-white shrink-0" : item.isAi ? "text-cyan-300 animate-pulse shrink-0" : "text-white/70 shrink-0"} />
                <span className="truncate">{item.label}</span>
              </div>
              
              {/* Badges / alerts */}
              {item.badge !== undefined && (
                <span className={`text-[9px] px-1.5 py-0.25 rounded font-bold shrink-0
                  ${item.id === 'inventory' 
                    ? "bg-rose-500 text-white" 
                    : "bg-amber-500 text-white"
                  }
                `}>
                  {item.badge}
                </span>
              )}
              {item.isAi && !isActive && (
                <span className="text-[8px] text-cyan-300 font-mono tracking-wider animate-pulse font-bold bg-cyan-950/45 px-1 py-0.25 rounded border border-cyan-400/20 shrink-0">
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Sync Status Control Panel */}
      {syncStatus && triggerSync && (
        <div className="p-3 mx-3 mb-2 bg-[#1E3A8A]/30 border border-white/10 rounded-xl space-y-2 text-[10px] text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[8px] uppercase tracking-wider text-slate-400">Spreadsheet Sync</span>
            <span className="flex items-center gap-1 font-bold text-[#DCEEFF] text-[10px]">
              {syncStatus.source}
              {syncStatus.status === 'synced' && <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />}
            </span>
          </div>

          <div className="flex gap-1.5 pt-0.5">
            <button
              onClick={() => triggerSync('OneDrive')}
              disabled={isSyncing}
              className="flex-1 py-1 bg-white/10 hover:bg-white/15 active:bg-white/5 rounded border border-white/15 text-[9px] font-bold transition cursor-pointer text-white disabled:opacity-50"
              title="Sync Microsoft OneDrive Excel file"
            >
              {isSyncing ? "Syncing..." : "OneDrive"}
            </button>
            <button
              onClick={() => triggerSync('Google Sheets')}
              disabled={isSyncing}
              className="flex-1 py-1 bg-[#4A90E2]/20 hover:bg-[#4A90E2]/35 active:bg-[#4A90E2]/10 rounded border border-blue-400/25 text-[9px] font-bold transition cursor-pointer text-[#DCEEFF] disabled:opacity-50"
              title="Sync Google Sheets"
            >
              Sheets
            </button>
          </div>
        </div>
      )}

      {/* Operator Session Node */}
      {currentUser && (
        <div className="p-3 border-t border-white/10 bg-black/10 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#4A90E2] text-white text-[10px] uppercase font-extrabold flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-bold text-[11px] text-white truncate leading-tight select-all">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[8px] text-slate-350 font-bold uppercase tracking-wider leading-none mt-0.5">
                {currentUser.role}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition cursor-pointer border border-transparent hover:border-white/10 animate-fade-in"
              title="Disconnect secure terminal session"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      )}

      {/* Footer / Location indicator */}
      <div className="p-3 bg-blue-950/40 text-[9px] text-slate-400 text-center space-y-0.5 border-t border-white/5 shrink-0">
        <p className="font-semibold text-slate-300 leading-none">Silchar Distribution Center</p>
        <p className="opacity-50 tracking-wide">SMCH Road • Assam, India</p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Layout: Persistent on md+ */}
      <aside className="hidden md:flex flex-col h-full bg-[#0F4C81] shrink-0 border-r border-[#1E3A8A]/30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Slide-in Overlay: Displayed on small screen if toggled open */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          
          {/* Backdrop screen shade */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition" 
            onClick={onCloseMobileMenu}
          ></div>
          
          {/* Sliding drawer content wrapper */}
          <div className="relative z-50 h-full animate-slide-right shadow-2xl">
            {sidebarContent}
          </div>
          
        </div>
      )}
    </>
  );
}
