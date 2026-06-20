import React from "react";
import { ERPData, BillingScheme, Product } from "../types";
import { formatINR } from "../utils";
import { Plus, Trash2, CheckCircle, Gift, Sparkles, Tag, ShieldCheck } from "lucide-react";

interface CampaignSchemesViewProps {
  data: ERPData;
  onSaveERPData: (updated: ERPData) => Promise<void>;
  currentUser: any;
}

export default function CampaignSchemesView({ data, onSaveERPData, currentUser }: CampaignSchemesViewProps) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<'BuyXGetY' | 'FlatDiscount' | 'ManufacturerFunded'>('BuyXGetY');
  
  const [productIdX, setProductIdX] = React.useState("");
  const [quantityX, setQuantityX] = React.useState(10);
  const [productIdY, setProductIdY] = React.useState("");
  const [quantityY, setQuantityY] = React.useState(1);

  const [discountPercentage, setDiscountPercentage] = React.useState(10);
  const [brandTarget, setBrandTarget] = React.useState("");
  const [manufacturerCode, setManufacturerCode] = React.useState("");

  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data.products.length > 0 && !productIdX) {
      setProductIdX(data.products[0].id);
      setProductIdY(data.products[0].id);
    }
  }, [data.products]);

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const brandNameClean = brandTarget.trim();

    const scheme: BillingScheme = {
      id: `scheme-${Date.now()}`,
      name,
      type,
      productIdX: type === 'BuyXGetY' ? productIdX : undefined,
      quantityX: type === 'BuyXGetY' ? quantityX : undefined,
      productIdY: type === 'BuyXGetY' ? productIdY : undefined,
      quantityY: type === 'BuyXGetY' ? quantityY : undefined,
      discountPercentage: type !== 'BuyXGetY' ? discountPercentage : undefined,
      manufacturerCode: type === 'ManufacturerFunded' ? manufacturerCode : undefined,
      brandTarget: type !== 'BuyXGetY' ? brandNameClean : undefined,
      active: true
    };

    const updatedERP: ERPData = {
      ...data,
      billingSchemes: [scheme, ...(data.billingSchemes || [])],
      activityLogs: [
        {
          id: `act-scheme-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          module: "Marketing & Pricing",
          action: `Activated pricing campaign scheme "${name}" (Formula Code: ${type})`
        },
        ...data.activityLogs
      ]
    };

    await onSaveERPData(updatedERP);
    setToast(`🎉 Dynamic billing campaign scheme "${name}" is now LIVE!`);
    setShowCreateForm(false);
    setName("");
    setBrandTarget("");
    setManufacturerCode("");
    setTimeout(() => setToast(null), 4000);
  };

  const currentSchemes = data.billingSchemes || [];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {toast && (
        <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header operations box */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Schemes & Offer Adjusters</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Configure free bonus stock thresholds (Buy-X-Get-Y), run flat trade discount percentages, and trace manufacturer-funded promo clearances inside POS billing counters.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[#0F4C81] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
        >
          <Plus size={14} />
          Create New Campaign
        </button>
      </div>

      {/* Grid of active schemes card widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentSchemes.map((scheme) => {
          const productX = data.products.find(p => p.id === scheme.productIdX);
          const productY = data.products.find(p => p.id === scheme.productIdY);

          return (
            <div key={scheme.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3 relative overflow-hidden flex flex-col justify-between">
              
              {/* Type tag icon header */}
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase ${
                  scheme.type === 'BuyXGetY' ? 'bg-amber-100 text-amber-800' :
                  scheme.type === 'FlatDiscount' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {scheme.type === 'BuyXGetY' && "Buy X Get Y Free"}
                  {scheme.type === 'FlatDiscount' && "Flat Brand Discount"}
                  {scheme.type === 'ManufacturerFunded' && "Mfr Funded Campaign"}
                </span>

                <span className={`text-[10px] font-black ${scheme.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  ● {scheme.active ? 'ACTIVE LIVE' : 'HOLDING'}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{scheme.name}</h4>
                <div className="text-[11px] text-slate-500 mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium leading-normal">
                  {scheme.type === 'BuyXGetY' && productX && productY && (
                    <p>When customer buys <span className="text-[#0F4C81] font-black">{scheme.quantityX} Unit</span> of <span className="font-bold">"{productX.brand}"</span> syringes, append <span className="text-emerald-600 font-black">{scheme.quantityY} Unit Free</span> of <span className="font-bold">"{productY.name}"</span>.</p>
                  )}
                  {scheme.type === 'FlatDiscount' && (
                    <p>Apply flat <span className="text-sky-600 font-black">{scheme.discountPercentage}% off</span> on any catalog lines matching brand name <span className="font-bold">"{scheme.brandTarget}"</span> automatically.</p>
                  )}
                  {scheme.type === 'ManufacturerFunded' && (
                    <p>Includes <span className="text-emerald-600 font-black">{scheme.discountPercentage}% rebate</span> sponsored by manufacturer brand <span className="font-bold">"{scheme.brandTarget}"</span>. Claim tracking clearance token: <span className="font-mono bg-white px-1 rounded border border-slate-200 text-slate-600 font-bold">{scheme.manufacturerCode}</span>.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] text-[#0F4C81] font-bold flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  POS Trigger Enabled
                </span>
                <span className="text-[10px] text-slate-400 font-bold font-mono">Code: {scheme.id.slice(-5)}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Creation form Overlay dialog */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateScheme} className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 space-y-4 font-sans">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#0F4C81] uppercase flex items-center gap-1">
                <Sparkles size={16} className="text-yellow-400 shrink-0" />
                Configure Core Retail Promo Scheme
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 block">Campaign Name / Sales Slogan</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Buy 10 Get 1 Trial Free on Hindustan Syringes"
                className="w-full border border-slate-200 rounded p-2 text-xs text-slate-800 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Interactive Target Type</span>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs bg-white text-slate-700 font-bold"
                >
                  <option value="BuyXGetY">🎁 Buy X quantity, Get Y Free</option>
                  <option value="FlatDiscount">🏷️ Flat Brand Discount percentage</option>
                  <option value="ManufacturerFunded">🛡️ Manufacturer-Funded campaign rebate</option>
                </select>
              </div>

              {type === 'BuyXGetY' ? (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Buy Quantity Trigger (X)</span>
                  <input
                    type="number"
                    value={quantityX}
                    onChange={(e) => setQuantityX(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-bold"
                  />
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Discount Rate Clearance (%)</span>
                  <input
                    type="number"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-bold"
                  />
                </div>
              )}
            </div>

            {type === 'BuyXGetY' ? (
              <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
                <span className="text-[9px] text-[#0F4C81] uppercase font-bold tracking-brand">Target Product and Reward SKU details</span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold block mb-0.5">Purchased Trigger Product</span>
                    <select
                      value={productIdX}
                      onChange={(e) => setProductIdX(e.target.value)}
                      className="w-full border border-slate-200 p-1.5 rounded text-[11px] bg-white font-semibold"
                    >
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold block mb-0.5">Free Appended Reward</span>
                    <div className="flex gap-1.5">
                      <select
                        value={productIdY}
                        onChange={(e) => setProductIdY(e.target.value)}
                        className="w-full border border-slate-200 p-1.5 rounded text-[11px] bg-white font-semibold"
                      >
                        {data.products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={quantityY}
                        onChange={(e) => setQuantityY(Number(e.target.value))}
                        className="w-16 border rounded p-1 text-xs text-center font-bold font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Target Brand Filter</span>
                  <input
                    type="text"
                    value={brandTarget}
                    onChange={(e) => setBrandTarget(e.target.value)}
                    placeholder="e.g. Omron"
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    required
                  />
                </div>
                {type === 'ManufacturerFunded' && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Reconciliation Co-funding Trace Token</span>
                    <input
                      type="text"
                      value={manufacturerCode}
                      onChange={(e) => setManufacturerCode(e.target.value)}
                      placeholder="e.g. OMRON-MFUND-2026"
                      className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Launch Scheme Live
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
