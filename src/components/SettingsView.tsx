import React from "react";
import { ERPData, SyncStatus, User } from "../types";
import { formatINR } from "../utils";
import { 
  Settings, 
  History, 
  Database, 
  RefreshCw, 
  Lock, 
  CheckCircle,
  FileSpreadsheet,
  Globe2,
  UsersRound,
  ShieldCheck,
  Palette,
  Upload,
  Image as ImageIcon
} from "lucide-react";

interface SettingsViewProps {
  data: ERPData;
  currentUser: User;
  onTriggerSync: (source: 'OneDrive' | 'Google Sheets') => void;
  isSyncing: boolean;
  onSaveLogoAndBranding: (logoUrl: string, brandName: string) => void;
}

export default function SettingsView({ data, currentUser, onTriggerSync, isSyncing, onSaveLogoAndBranding }: SettingsViewProps) {
  const [logoInput, setLogoInput] = React.useState(data.appLogo || "");
  const [appNameInput, setAppNameInput] = React.useState(data.appName || "Divine Surgicals");
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state if values evolve inside central node
  React.useEffect(() => {
    if (data.appLogo !== undefined) setLogoInput(data.appLogo);
    if (data.appName !== undefined) setAppNameInput(data.appName);
  }, [data.appLogo, data.appName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // limit 1MB max for database safety
        alert("The selected logo file is too large. Choose a compressed image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLogoInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = () => {
    onSaveLogoAndBranding(logoInput, appNameInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const presetLogos = [
    { name: "Clinical Blue", url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=120&auto=format&fit=crop" },
    { name: "Surgical Heart", url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=120&auto=format&fit=crop" },
    { name: "Gold Scalpel", url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=120&auto=format&fit=crop" },
  ];

  return (
    <div className="space-y-6">

      {/* App Custom Logo Rebranding Options */}
      {currentUser.role === 'Owner' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Palette className="text-[#0F4C81]" size={18} />
            <div>
              <h3 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Enterprise Personalization & Logo Center</h3>
              <p className="text-[10px] text-slate-400 font-medium">Rebrand the workspace layout, sidebars, and invoices instantly.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Logo image upload section */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center relative group min-h-[160px]">
              {logoInput ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-white rounded-2xl border border-slate-150 p-2 overflow-hidden flex items-center justify-center shadow-inner mx-auto">
                    <img src={logoInput} alt="Custom Business Logo" className="w-full h-full object-contain select-none" referrerPolicy="no-referrer" />
                  </div>
                  <button 
                    onClick={() => setLogoInput("")}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer font-bold block mx-auto"
                  >
                    Clear Custom Logo
                  </button>
                </div>
              ) : (
                <div className="space-y-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-150 inline-block text-slate-400 group-hover:text-[#0F4C81] transition shadow-xs">
                    <Upload size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Upload Corporate Logo</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">Drag-and-drop or click file<br />(PNG, JPG, WebP &lt; 1MB)</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Title override and quick preset options */}
            <div className="md:col-span-8 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="app-name-field">Workstation Name / Custom Title</label>
                <input 
                  id="app-name-field"
                  type="text" 
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                  placeholder="e.g. Divine Surgicals & Co."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#4A90E2] text-xs font-semibold text-slate-800 rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or Click Diagnostic Presets</span>
                <div className="flex flex-wrap gap-2">
                  {presetLogos.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLogoInput(preset.url)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#0F4C81] text-[10px] font-medium text-slate-600 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <img src={preset.url} alt="Preset thumbnail" className="w-4 h-4 rounded object-cover brightness-95 text-xs" referrerPolicy="no-referrer" />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle size={14} /> Rebranding saved successfully!
                  </span>
                )}
                <button
                  onClick={handleSaveBranding}
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-900/10 cursor-pointer"
                >
                  Apply Rebranding
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Synchronization architecture overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sync configuration options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Settings className="text-[#0F4C81]" size={20} />
            <h3 className="text-xs font-bold text-[#0F4C81] uppercase tracking-wider">Cloud Sync Engine</h3>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Divine Surgicals ERP connects seamlessly to external spreadsheets. All changes update instantly; changes in Excel are compiled in real time.
          </p>

          <div className="space-y-3 pt-2">
            
            {/* OneDrive Box */}
            <div className="border border-slate-150 rounded-xl p-3 bg-[#F8FBFF] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#0F4C81] flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-blue-500" />
                  Microsoft OneDrive Excel
                </span>
                <span className="text-[9px] font-bold text-slate-400 font-mono">ACTIVE-LINK</span>
              </div>
              <p className="text-[10px] text-slate-500">Connected target: <strong>DivineSurgicals_ERP.xlsx</strong></p>
              
              <button
                onClick={() => onTriggerSync('OneDrive')}
                disabled={isSyncing}
                className="w-full py-1.5 bg-[#0F4C81] hover:bg-opacity-95 text-white text-[10px] font-bold rounded-lg transition disabled:bg-slate-200 cursor-pointer text-center"
              >
                {isSyncing ? "Triggering Live API node..." : "Force Sync OneDrive Now"}
              </button>
            </div>

            {/* Google Sheets Box */}
            <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#4A90E2] flex items-center gap-1.5">
                  <Globe2 size={16} className="text-green-600" />
                  Google Sheets Integration
                </span>
                <span className="text-[9px] font-bold text-slate-400 font-mono">STANDBY</span>
              </div>
              <p className="text-[10px] text-slate-500">Connected sheet: <strong>DivineSurgicals_ERP_Sheet</strong></p>
              
              <button
                onClick={() => onTriggerSync('Google Sheets')}
                disabled={isSyncing}
                className="w-full py-1.5 bg-[#4A90E2] hover:bg-opacity-95 text-white text-[10px] font-bold rounded-lg transition disabled:bg-slate-200 cursor-pointer text-center"
              >
                {isSyncing ? "Syncing standard Sheets node..." : "Trigger Google Sheets Import"}
              </button>
            </div>

          </div>

        </div>

        {/* Sync logs timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History size={16} className="text-[#0F4C81]" />
              Spreadsheet Synchronization History Log
            </h3>
            <span className="text-[10px] text-slate-400">Current status: {data.syncStatus.lastSyncedText}</span>
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
            {data.syncStatus.log && data.syncStatus.log.length > 0 ? (
              data.syncStatus.log.map((log) => (
                <div key={log.id} className="p-4 text-xs hover:bg-slate-50/50 transition flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0
                    ${log.type === 'upload' ? "bg-blue-50 text-[#0F4C81]" : "bg-emerald-50 text-emerald-800"}
                  `}>
                    <Database size={14} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-bold text-slate-800 leading-none">{log.action}</p>
                      <span className="text-[9px] text-slate-400 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      File: <span className="font-mono text-slate-600">{log.sheetName}</span> • Synchronized {log.rowsCount} cells rows • Action Direction: <span className="uppercase font-bold">{log.type}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-12 text-center text-slate-400 font-medium text-xs">No synchronization operations recorded.</p>
            )}
          </div>
        </div>

      </div>

      {/* Audit Logs Trail Module 10 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#0F4C81]" />
            Security Audit Trail & Admin Activity Log (ISO-9001 Compliant)
          </h3>
          <span className="text-[10px] bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded font-bold border border-rose-100">
            Enterprise Integrity Shield Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-medium text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-450 uppercase tracking-wider border-b border-slate-100">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Authorized User</th>
                <th className="py-2.5 px-4">ERP Module</th>
                <th className="py-2.5 px-4">Action Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {data.activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 space-y-0.5">
                    <p className="font-bold text-slate-800">{log.userName}</p>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded font-bold uppercase">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-semibold">{log.module}</td>
                  <td className="py-3 px-4 text-slate-700 font-normal">
                    {log.action}
                  </td>
                </tr>
              ))}
              {data.activityLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No operations registered under this current host.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
