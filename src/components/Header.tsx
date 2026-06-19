import React from "react";
import { User, SyncStatus, UserRole } from "../types";
import { Cloud, CheckCircle, RefreshCw, AlertTriangle, Moon, Sun, ShieldCheck, Database, LogOut, Menu } from "lucide-react";

interface HeaderProps {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  syncStatus: SyncStatus;
  triggerSync: (source: 'OneDrive' | 'Google Sheets') => void;
  isSyncing: boolean;
  users: User[];
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({ currentUser, setCurrentUser, syncStatus, triggerSync, isSyncing, users, onLogout, onToggleMobileMenu }: HeaderProps) {
  const [currentDateString, setCurrentDateString] = React.useState("");

  React.useEffect(() => {
    // Show current local time
    const updateTime = () => {
      const now = new Date();
      setCurrentDateString(now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = users.find(u => u.id === e.target.value);
    if (selected) {
      setCurrentUser(selected);
    }
  };

  return (
    <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sticky top-0 z-40 shadow-xs select-none">
      
      {/* Brand, Hamburger toggling, & Location info */}
      <div className="flex items-center justify-between md:justify-start gap-3">
        <div className="flex items-center gap-3">
          
          {/* Mobile Hamburg menu drawer toggle */}
          {onToggleMobileMenu && (
            <button 
              onClick={onToggleMobileMenu}
              className="p-2 -ml-1 hover:bg-slate-50 border border-slate-200 active:bg-slate-100 text-slate-600 rounded-xl md:hidden transition cursor-pointer"
              title="Toggle sidebar navigation links drawer"
            >
              <Menu size={18} />
            </button>
          )}

          <div className="bg-[#0F4C81] text-white p-2 rounded-xl shadow-md shadow-blue-950/10 shrink-0">
            <Database size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-[#0F4C81] tracking-tight flex items-center gap-1.5">
              Divine Surgicals <span className="text-[10px] bg-[#DCEEFF] text-[#0F5C9E] px-1.5 py-0.25 rounded-full font-bold">ERP V1.2</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Silchar, Assam • Medical Logistical Hub</p>
          </div>
        </div>
        
        {/* Real-time Clock inside mobile layouts */}
        <div className="text-[10px] font-mono text-slate-400 block lg:hidden md:text-right">
          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Right Column: Date, Sync, Role Selection */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        
        {/* Real-time Clock (Desktop view only) */}
        <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hidden lg:block">
          {currentDateString || "Loading clock..."}
        </div>

        {/* Excel / Cloud Sync Widget */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-xs text-slate-700 flex-1 md:flex-none">
          <Cloud size={14} className={isSyncing ? "text-amber-500 animate-spin shrink-0" : "text-blue-500 shrink-0"} />
          <div className="flex flex-col text-left">
            <span className="font-semibold text-[9px] text-slate-400 uppercase tracking-wider leading-none">Spreadsheet Sync</span>
            <span className="font-bold text-slate-600 text-[11px] mt-0.5 flex items-center gap-1">
              Active: {syncStatus.source}
              {syncStatus.status === 'synced' && <CheckCircle size={10} className="text-emerald-500 shrink-0" />}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
            <button
              onClick={() => triggerSync('OneDrive')}
              disabled={isSyncing}
              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-250 active:bg-slate-50 rounded text-[9px] font-bold transition cursor-pointer text-[#0F4C81]"
              title="Sync Microsoft OneDrive Excel"
            >
              OneDrive
            </button>
            <button
              onClick={() => triggerSync('Google Sheets')}
              disabled={isSyncing}
              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-250 active:bg-slate-50 rounded text-[9px] font-bold transition cursor-pointer text-[#4A90E2]"
              title="Sync Google Sheets"
            >
              Sheets
            </button>
          </div>
        </div>

        {/* Interactive User Switcher / Identity Badge */}
        <div className="flex items-center gap-2 bg-[#DCEEFF]/40 px-3 py-1 rounded-lg border border-blue-100 font-medium">
          <div className="w-6 h-6 rounded-full bg-[#0F4C81] text-white text-[10px] uppercase font-extrabold flex items-center justify-center shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex flex-col text-left">
            <label htmlFor="role-selector" className="font-semibold text-[8px] text-slate-500 uppercase tracking-wider leading-none">Operator / Access Role</label>
            <select
              id="role-selector"
              value={currentUser.id}
              onChange={handleUserChange}
              className="font-bold text-[11px] text-[#0F4C81] bg-transparent focus:outline-none border-none py-0.5 pr-4 pl-0 cursor-pointer text-ellipsis overflow-hidden max-w-[120px] md:max-w-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Logout Trigger button */}
          <button
            onClick={onLogout}
            className="p-1 hover:bg-white/60 active:bg-white/80 shrink-0 rounded transition hover:text-rose-600 text-[#0F4C81]/80 ml-1.5 cursor-pointer"
            title="Log Out corporate session"
          >
            <LogOut size={13} />
          </button>
        </div>

      </div>
    </header>
  );
}
