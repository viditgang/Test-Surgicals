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
  X
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lowStockCount: number;
  expiringSoonCount: number;
  isOpenOnMobile?: boolean;
  onCloseMobileMenu?: () => void;
  appLogo?: string;
  appName?: string;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  lowStockCount, 
  expiringSoonCount,
  isOpenOnMobile = false,
  onCloseMobileMenu,
  appLogo,
  appName = "Divine Surgicals"
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

      {/* Footer / Location indicator */}
      <div className="p-4 border-t border-white/10 bg-blue-950/30 text-[10px] text-slate-300 text-center space-y-0.5">
        <p className="font-bold text-[#DCEEFF] leading-tight truncate">{appName}</p>
        <p className="opacity-70 leading-none">N.H. Way, Silchar, Assam</p>
        <p className="opacity-40 text-[8px] font-mono leading-none pt-0.5">GSTIN: 18AABCS9912D1ZS</p>
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
