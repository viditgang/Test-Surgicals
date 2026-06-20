import React from "react";
import { SalesInvoice, PaymentReceipt } from "../types";
import { formatINR } from "../utils";
import { Printer, CheckCircle, CreditCard, Clock, Plus, X } from "lucide-react";

interface GSTInvoicePrintProps {
  invoice: SalesInvoice;
  onClose: () => void;
  onLogPayment: (invoiceId: string, payment: Omit<PaymentReceipt, 'id'>) => void;
  merchantUpiId?: string;
}

export default function GSTInvoicePrint({
  invoice,
  onClose,
  onLogPayment,
  merchantUpiId = "divine@upi"
}: GSTInvoicePrintProps) {
  const [showPaymentForm, setShowPaymentForm] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState(invoice.grandTotal - (invoice.amountPaid || 0));
  const [payMethod, setPayMethod] = React.useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('UPI');
  const [payRef, setPayRef] = React.useState("");
  const [payNotes, setPayNotes] = React.useState("");

  const [simulatedUpiStatus, setSimulatedUpiStatus] = React.useState<'idle' | 'scanning' | 'verified'>('idle');

  const printBill = () => {
    const printContent = document.getElementById("gst-printable-area");
    const originalContent = document.body.innerHTML;
    if (printContent) {
      // Create a style block for clean print styling
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          body { background: white; color: black; font-size: 11px; margin: 10mm; }
          .no-print { display: none !important; }
          .print-full { width: 100% !important; border: none !important; box-shadow: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; }
        }
      `;
      document.head.appendChild(style);
      window.print();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(payAmount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    onLogPayment(invoice.id, {
      amount: Number(payAmount),
      date: new Date().toISOString().split("T")[0],
      paymentMethod: payMethod,
      transactionRef: payRef,
      notes: payNotes
    });
    setShowPaymentForm(false);
    setPayRef("");
    setPayNotes("");
  };

  const amountPaid = invoice.amountPaid || 0;
  const amountOutstanding = invoice.grandTotal - amountPaid;

  // Detect state of supply to calculate splits
  const stateCode = invoice.customerGst?.slice(0, 2) || "18";
  const isIntrastate = !invoice.customerState || invoice.customerState.toLowerCase().includes("assam") || stateCode === "18";

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto font-sans my-8">
        
        {/* Actions header bar with Print */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#DCEEFF] text-[#0F4C81] font-black px-2.5 py-1 rounded">
              GST TAX BILL: {invoice.invoiceNumber}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
              invoice.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={printBill}
              className="px-4 py-2 bg-[#0F4C81] text-white hover:bg-opacity-95 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Print Tax Invoice"
            >
              <Printer size={14} />
              Print Invoice 
            </button>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CreditCard size={14} />
              Log Payment Receipt
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition cursor-pointer ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* payment logger inline drawer */}
        {showPaymentForm && (
          <form onSubmit={handleFormSubmit} className="my-4 p-4 bg-slate-50 border border-emerald-100 rounded-xl space-y-3 no-print">
            <h4 className="text-xs font-black text-emerald-800">Add Payment Receipt Log</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[9px] text-slate-500 font-bold block mb-1">Receipt Amount (₹)</span>
                <input
                  type="number"
                  max={amountOutstanding}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs font-bold"
                  required
                />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold block mb-1">Receipt Method</span>
                <select
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs font-bold"
                >
                  <option value="UPI">BHIM UPI QR</option>
                  <option value="Cash">Cash Drawer</option>
                  <option value="Bank Transfer">NEFT / RTGS</option>
                  <option value="Card">HDFC Swipe</option>
                </select>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold block mb-1">Transaction Ref / IMPS #</span>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UPI8102371"
                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                >
                  Confirm Receipt
                </button>
              </div>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold block mb-1">Internal Ledger Note</span>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Received partial payment from Dental division red cross"
                className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs"
              />
            </div>
          </form>
        )}

        {/* GST Printable Document Area */}
        <div id="gst-printable-area" className="mt-4 p-6 border border-slate-200 rounded-2xl space-y-6 bg-white shadow-xs print-full text-slate-800">
          
          {/* Header block with Logo and corporate details */}
          <div className="flex justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F4C81] tracking-tight uppercase">DIVINE SURGICALS</h2>
              <p className="text-[10px] text-slate-500 font-bold tracking-brand">Surgical Implants & Advanced Consumables wholesale</p>
              <p className="text-[9px] text-slate-400 mt-1">National Highway Bypass Road, Silchar, Cachar, Assam (788005)</p>
              <p className="text-[9px] font-bold text-[#0F4C81] font-mono mt-0.5">GSTIN: 18AABCS9912D1ZS | State Code: 18 (Assam)</p>
            </div>

            <div className="text-right text-xs">
              <h4 className="font-mono text-sm font-black text-slate-700">TAX INVOICE</h4>
              <p className="font-bold text-[#0F4C81]">{invoice.invoiceNumber}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Invoice Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
              <p className="text-[10px] text-slate-400">Cashier Counter: {invoice.createdBy}</p>
            </div>
          </div>

          {/* Consignee and state of supply details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div>
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[8px]">Consigned To / Billed Destination</span>
              <p className="font-black text-slate-800 text-xs mt-1">{invoice.customerName}</p>
              <p className="text-slate-500 font-semibold mt-0.5">Target Contact: {invoice.customerMobile}</p>
              {invoice.customerGst ? (
                <p className="font-mono text-[#0F4C81] font-bold mt-1">CLIENT GSTIN: {invoice.customerGst}</p>
              ) : (
                <p className="text-slate-400 italic mt-1 font-semibold">Walk-In Retail Client (No GSTIN registered)</p>
              )}
            </div>

            <div className="border-l border-slate-200 pl-0 md:pl-4 space-y-0.5">
              <span className="font-black text-slate-400 uppercase tracking-wider block text-[8px]">SUPPLY CHAIN ROUTING</span>
              <p className="text-slate-600">State of Supply: <span className="font-bold text-slate-700">{invoice.customerState || "Assam Node (18)"}</span></p>
              <p className="text-slate-600">Tax Type Applied: <span className="font-bold text-[#0F4C81]">{isIntrastate ? "INTRA-STATE TRANSACTION (CGST + SGST split)" : "INTER-STATE TRANSACTION (IGST only)"}</span></p>
              <p className="text-slate-600">Fulfillment Center: <span className="font-bold text-slate-700">Federal depot dispatch platform 2</span></p>
            </div>
          </div>

          {/* Core Goods lines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-medium border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[8px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Dental & Surgical description of Goods</th>
                  <th className="py-2.5 px-2 text-center">Batch Bill</th>
                  <th className="py-2.5 px-2 text-right">Taxable rate</th>
                  <th className="py-2.5 px-2 text-center">Quantity</th>
                  <th className="py-2.5 px-2 text-right">CGST split</th>
                  <th className="py-2.5 px-2 text-right">SGST split</th>
                  <th className="py-2.5 px-2 text-right">IGST split</th>
                  <th className="py-2.5 px-3 text-right">Amount Billed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {invoice.items.map((it, idx) => {
                  const lineTaxable = it.quantity * it.unitPrice;
                  const cgstRt = isIntrastate ? it.gstRate / 2 : 0;
                  const sgstRt = isIntrastate ? it.gstRate / 2 : 0;
                  const igstRt = !isIntrastate ? it.gstRate : 0;

                  const cgstAmt = isIntrastate ? it.gstAmount / 2 : 0;
                  const sgstAmt = isIntrastate ? it.gstAmount / 2 : 0;
                  const igstAmt = !isIntrastate ? it.gstAmount : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/55">
                      <td className="py-2 px-3">
                        <p className="font-bold text-slate-950">{it.name}</p>
                        <p className="text-[9pt] text-slate-400 font-mono">SKU: {it.sku}</p>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500">{it.batchNumber || "FEFO Auto"}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatINR(it.unitPrice)}</td>
                      <td className="py-2 px-2 text-center font-black text-slate-800">{it.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-400">{cgstRt > 0 ? `${cgstRt}% (${formatINR(cgstAmt)})` : '-'}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-400">{sgstRt > 0 ? `${sgstRt}% (${formatINR(sgstAmt)})` : '-'}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-400">{igstRt > 0 ? `${igstRt}% (${formatINR(igstAmt)})` : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">{formatINR(it.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Payment Receipt Split row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-200">
            
            {/* Payment history log and QR code */}
            <div className="md:col-span-6 space-y-4">
              
              {/* Payment Receipt status cards */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Fulfillment Payments Clearing Ledger</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 border border-slate-100 rounded">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Grand Total Bill</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{formatINR(invoice.grandTotal)}</span>
                  </div>
                  <div className="bg-white p-2 border border-slate-100 rounded">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Total Cleared</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-600">{formatINR(amountPaid)}</span>
                  </div>
                  <div className="bg-white p-2 border border-slate-100 rounded animate-pulse">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Outstanding</span>
                    <span className="text-xs font-mono font-bold text-rose-500">{formatINR(amountOutstanding)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Transactions logs list */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Receipt transaction entries ledger</span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-[140px] overflow-y-auto space-y-2 text-[10px] leading-relaxed">
                  {invoice.paymentsList && invoice.paymentsList.length > 0 ? (
                    invoice.paymentsList.map((p, idx) => (
                      <div key={p.id || idx} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded">
                        <div>
                          <p className="font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')} via {p.paymentMethod}</p>
                          <p className="text-[8px] text-slate-400">{p.date} • Ref: {p.transactionRef || 'N/A'}</p>
                        </div>
                        {p.notes && <span className="text-[8px] bg-slate-100 px-1 rounded-sm text-slate-400 italic">"{p.notes}"</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-4 italic">
                      {invoice.status === 'Paid' ? (
                        <span>Initial billing fully cleared at checkout.</span>
                      ) : (
                        <span>No specific payment log receipts verified yet. Outstanding is due!</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* UPI Code inside Printable area for direct physical checkouts */}
              {amountOutstanding > 0 && (
                <div className="no-print p-3 border border-slate-150 rounded-xl bg-white flex items-center gap-3.5 max-w-[340px]">
                  <div className="relative shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                        `upi://pay?pa=${merchantUpiId}&pn=Divine%20Surgicals&am=${amountOutstanding}&tn=${invoice.invoiceNumber}&cu=INR`
                      )}`} 
                      alt="UPI billing QR"
                      referrerPolicy="no-referrer"
                      className="h-20 w-20 object-contain block bg-slate-100 p-1"
                    />
                    {simulatedUpiStatus === 'scanning' && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[8px] text-center">
                        <Clock size={12} className="animate-spin text-yellow-400 mb-1" />
                        <span>Verifying...</span>
                      </div>
                    )}
                    {simulatedUpiStatus === 'verified' && (
                      <div className="absolute inset-0 bg-emerald-900/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[8px] text-center">
                        <CheckCircle size={14} className="text-emerald-400 mb-1" />
                        <span>Verifed!</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 uppercase">Interactive Scan-To-Pay</p>
                    <p className="text-[9px] text-slate-400 italic">Scan with PhonePe, GPay, Paytm to settle outstanding ₹{amountOutstanding.toFixed(2)} instantly.</p>
                    {simulatedUpiStatus === 'idle' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedUpiStatus('scanning');
                          setTimeout(() => {
                            setSimulatedUpiStatus('verified');
                            onLogPayment(invoice.id, {
                              amount: amountOutstanding,
                              date: new Date().toISOString().split("T")[0],
                              paymentMethod: 'UPI',
                              transactionRef: `SIM-UPI-${Date.now().toString().slice(-6)}`,
                              notes: "UPI Instant payment scan confirmation"
                            });
                          }, 2000);
                        }}
                        className="mt-1 px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-100 hover:bg-sky-100 text-[8px] font-bold rounded cursor-pointer uppercase transition font-mono"
                      >
                        Simulate Settle
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tax totals block */}
            <div className="md:col-span-6 space-y-2 text-right text-xs font-semibold">
              <div className="flex justify-between border-b pb-1 text-slate-400 font-bold uppercase tracking-wider text-[8px]">
                <span>Taxes & Values Description</span>
                <span>Subtotals / GST sum</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Taxable Amount (Excl. GST):</span>
                <span className="font-mono font-bold text-slate-700">{formatINR(invoice.subtotal)}</span>
              </div>

              {isIntrastate ? (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Central GST (CGST Output):</span>
                    <span className="font-mono font-semibold text-slate-700">{formatINR(invoice.totalGst / 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>State GST (SGST Output):</span>
                    <span className="font-mono font-semibold text-slate-700">{formatINR(invoice.totalGst / 2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-500">
                  <span>Integrated GST (IGST Output):</span>
                  <span className="font-mono font-semibold text-slate-700">{formatINR(invoice.totalGst)}</span>
                </div>
              )}

              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Trade Discount Offered:</span>
                  <span className="font-mono">- {formatINR(invoice.discount)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-350 pt-2 text-sm font-black text-[#0F4C81]">
                <span>Invoice Net Payable:</span>
                <span className="font-mono text-base">{formatINR(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 border-t border-slate-100 pt-1 text-[10px]">
                <span>Total Cleared Recieved:</span>
                <span className="font-mono font-bold">{formatINR(amountPaid)}</span>
              </div>

              <div className="flex justify-between text-rose-500 border-t border-slate-100 pt-1 text-[10px] font-bold">
                <span>Net Outstanding Remaining:</span>
                <span className="font-mono font-bold">{formatINR(amountOutstanding)}</span>
              </div>

              <div className="pt-4 text-[8px] text-slate-400 italic">
                *Subject to Silchar Jurisdiction. Supply of surgical implants & consumables.
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
