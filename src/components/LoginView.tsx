import React from "react";
import { Lock, ShieldCheck, HelpCircle, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { User, UserRole } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  appLogo?: string;
  appName?: string;
}

export default function LoginView({ onLoginSuccess, appLogo, appName }: LoginViewProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasGoogleKeys, setHasGoogleKeys] = React.useState<boolean>(true);
  const [showSimulatedModal, setShowSimulatedModal] = React.useState(false);

  // Check Google client configuration capability on mount
  React.useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/auth/google/url");
        if (res.ok) {
          const text = await res.json();
          setHasGoogleKeys(text.hasConfig);
        }
      } catch (e) {
        setHasGoogleKeys(false);
      }
    };
    checkConfig();
  }, []);

  // Handle Google popup flow (Standard Popup-Based OAuth Flow as per skill rules)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/google/url?redirect_origin=${window.location.origin}`);
      if (!res.ok) {
        throw new Error("Unable to trigger backend Google OAuth protocol.");
      }
      const { url, hasConfig } = await res.json();

      if (!hasConfig) {
        // Fallback to simulator selector mode ifkeys are missing
        setShowSimulatedModal(true);
        setLoading(false);
        return;
      }

      // Open OAuth provider directly as required by skill rules
      const popupWidth = 550;
      const popupHeight = 650;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      const authWindow = window.open(
        url,
        "google_oauth_popup",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=0,menubar=0`
      );

      if (!authWindow) {
        throw new Error("Popup blocked. Please authorize popups for this site to log in.");
      }

      // Live listener for successful auth message from popup callback handler
      const handleAuthMessage = (event: MessageEvent) => {
        // Validate origin
        const origin = event.origin;
        if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
          return;
        }

        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          const authenticatedUser = event.data.user as User;
          const token = event.data.token as string;
          onLoginSuccess(authenticatedUser, token);
          window.removeEventListener("message", handleAuthMessage);
          setLoading(false);
        }
      };

      window.addEventListener("message", handleAuthMessage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication timeout occurred.");
      setLoading(false);
    }
  };

  // Simulated account auth for easy, seamless sandbox execution
  const handleSimulatedSignIn = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Simulation authentication failed.");
      }

      const { user, token } = await res.json();
      onLoginSuccess(user, token);
      setShowSimulatedModal(false);
    } catch (err: any) {
      setError(err.message || "Simulation login error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 font-sans select-none relative overflow-hidden">
      
      {/* Decorative gradient canvas bg */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#E2F0FD]/80 to-transparent -z-10 rounded-b-full scale-125 opacity-70 blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden shrink-0 z-10 transition-all">
        
        {/* Banner header inside card */}
        <div className="bg-gradient-to-r from-[#0F4C81] to-[#3B82F6] p-8 text-white text-center relative">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
          
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center p-3 border border-white/20 mb-4 shadow-inner">
            {appLogo ? (
              <img src={appLogo} alt="App Logo" className="w-full h-full object-contain select-none" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-cyan-200" />
            )}
          </div>

          <p className="text-[10px] tracking-widest font-bold uppercase text-cyan-250 leading-tight">
            {appName ? `${appName}` : "Divine Surgicals"} ERP
          </p>
          <h2 className="text-xl font-bold tracking-tight">Workstation Portal Entry</h2>
          <p className="text-[11px] text-cyan-100/90 mt-1">Silchar Central Distribution Hub Node</p>
        </div>

        {/* Form Body segment */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verify Secure Identity</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Please sign in with your corporate or associated Google Account to unlock authorized medical inventory and ledger modules.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[11px] text-rose-700 leading-normal flex items-start gap-2 animate-fade-in">
              <Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition duration-150 cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.433-2.61 4.114-5.647 4.114-3.778 0-6.84-3.062-6.84-6.84s3.062-6.84 6.84-6.84c1.687 0 3.224.61 4.414 1.621l3.056-3.056C18.89 1.62 15.748 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.8 0 12.24-5.44 12.24-12.24 0-.814-.076-1.607-.22-2.378H12.24z"
                />
              </svg>
              <span>{loading ? "Establishing handshake..." : "Sign in with Google"}</span>
            </button>

            {/* Quick Simulation Login option if Google Secrets are not active */}
            {!hasGoogleKeys && (
              <div className="pt-2 text-center">
                <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl space-y-2 mb-2">
                  <span className="inline-block text-[10px] text-amber-800 font-bold bg-amber-100/50 px-2.5 py-0.5 rounded-full">
                    DEMO ENVIRONMENT ACTIVE
                  </span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Google credentials (client keys) are not yet configured in local <strong>.env</strong> variables.
                  </p>
                </div>
                
                <button
                  onClick={() => setShowSimulatedModal(true)}
                  className="w-full text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center justify-center gap-1 py-1 cursor-pointer"
                >
                  <Users size={12} />
                  <span>Launch Google Sign-In Simulator Account Chooser</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
            
            {hasGoogleKeys && (
              <div className="text-center">
                <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1 leading-none py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <CheckCircle2 size={11} />
                  Live Google API Identity handshake enabled
                </p>
              </div>
            )}

          </div>

          {/* Security policy footnote */}
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#0F4C81]" /> ISO 27001 Certified
            </span>
            <span>Silchar HQ Network</span>
          </div>

        </div>

      </div>

      {/* FOOTER COOPERATIVE CREDITS */}
      <div className="mt-8 text-center space-y-1 z-10 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-500">&copy; 2026 Divine Surgicals Distribution Ltd.</p>
        <p>Managed Logistics Management System, Ghungoor SMCH Road, Silchar, Assam</p>
      </div>

      {/* GOOGLE ACCOUNT SELECTOR MODAL SIMULATOR */}
      {showSimulatedModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
            
            {/* Modal Google styled login box */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex flex-col items-center">
              <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.91h6.63c-.29 1.5-.1.8-2.06 2.8l3.19 2.47c1.86-1.72 2.98-4.25 2.98-7.11z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.19-2.47c-.89.6-2.03.95-3.21.95-3.19 0-5.89-2.15-6.85-5.06l-3.3 2.56C5.35 21.05 8.39 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.15 14.51c-.25-.7-.39-1.45-.39-2.23s.14-1.53.39-2.23L1.85 7.49C.67 9.87 0 12.56 0 15.39s.67 5.52 1.85 7.9l3.3-2.56-3.3 2.56c-.25-.7-.39-1.45-.39-2.23h11.23h4.14v3.91h6.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.08 15.24 0 12 0 8.39 0 5.35 2.95 3.4 6.36l3.3 2.56c.96-2.91 3.66-5.06 6.85-5.06z"
                />
              </svg>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight font-sans">Google Single Sign-On</h3>
              <p className="text-[10px] text-slate-400 mt-1 text-center font-sans">Verify your registered corporate Google Account email to unlock active terminal segments.</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const emailVal = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
              handleSimulatedSignIn(emailVal);
            }} className="p-5 space-y-4 font-sans">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Google Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. gangvidit@gmail.com"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent font-mono"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[10px] text-rose-700 font-semibold leading-normal">
                  ⚠️ {error}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl text-[9.5px] text-slate-500 leading-normal border border-slate-150">
                ⭐ <strong>Access Controls:</strong> Enter <code>gangvidit@gmail.com</code> (Principal Owner) or any custom staff email registered in the personnel roster.
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowSimulatedModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#0F4C81] text-white hover:bg-opacity-95 rounded-xl shadow-xs cursor-pointer"
                >
                  {loading ? "Authenticating..." : "Next"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
