import React from "react";
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Sparkles,
  RefreshCw,
  Info
} from "lucide-react";

interface ExcelImportWidgetProps {
  type: 'sales' | 'customers' | 'suppliers' | 'purchases' | 'inventory';
  onImport: (items: any[]) => void;
  availableProducts?: Array<{ sku: string; name: string }>;
}

export default function ExcelImportWidget({ type, onImport, availableProducts = [] }: ExcelImportWidgetProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [successCount, setSuccessCount] = React.useState<number | null>(null);
  const [showGuide, setShowGuide] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getTemplateMeta = () => {
    switch (type) {
      case 'customers':
        return {
          filename: "divine_customers_template.csv",
          headers: ["Name", "Mobile", "Email", "Address", "GSTNumber", "CreditLimit"],
          examples: [
            ["Silchar Red Cross Hospital", "9854012345", "billing@redcross-silchar.org", "Club Road, Silchar, Assam", "18AAACS9912D1ZS", "500000"],
            ["Barak Valley Kidney Institute", "9435011223", "procurement@bvki.co.in", "Ghungoor Bypass Road, Silchar", "18AAAKB1212B2ZA", "300000"]
          ],
          guide: "Required: Name and Mobile. Credit limit defaults to ₹200,000 if blank."
        };
      case 'suppliers':
        return {
          filename: "divine_suppliers_template.csv",
          headers: ["Name", "ContactPerson", "MobileNumber", "Email", "GSTNumber", "Address", "PaymentTerms"],
          examples: [
            ["Assam Surgical Manufacturing Corp", "Deepak Gogoi", "9864200111", "sales@assamsurgicals.com", "18AABCA3314A1ZC", "Industrial Area, Guwahati", "Net 30"],
            ["Nightingale Healthcare Supplies", "Sister Mary", "9411223344", "dispatch@nightingale.org", "18AABCN9098E4Z0", "GS Road, Shillong", "COD"]
          ],
          guide: "Required: Supplier Name and MobileNumber. Onboarding defaults to preferred partner status."
        };
      case 'purchases':
        return {
          filename: "divine_purchase_orders_template.csv",
          headers: ["PONumber", "SupplierName", "ProductSku", "Quantity", "PurchasePrice", "Notes"],
          examples: [
            ["PO-AUTO-001", "Assam Surgical Manufacturing Corp", "ORTHO-CATH-018", "150", "320", "Urgent orthopedic unit catheters"],
            ["PO-AUTO-001", "Assam Surgical Manufacturing Corp", "DISP-SYR-005", "1000", "12", "5ml disposable luer slip syringe lot"]
          ],
          guide: "Required: PONumber, SupplierName, ProductSku, Quantity. Multiple SKUs sharing the same 'PONumber' will compile into one purchase order."
        };
      case 'sales':
        return {
          filename: "divine_sales_invoices_template.csv",
          headers: ["InvoiceNumber", "CustomerName", "CustomerMobile", "ProductSkuOrName", "Quantity", "UnitPrice", "PaymentMethod", "Status"],
          examples: [
            ["INV-AUTO-99", "Silchar Red Cross Hospital", "9854012345", "ORTHO-CATH-018", "50", "450", "UPI", "Paid"],
            ["INV-AUTO-99", "Silchar Red Cross Hospital", "9854012345", "DISP-SYR-005", "300", "18", "UPI", "Paid"]
          ],
          guide: "Required: InvoiceNumber, CustomerName, ProductSkuOrName (or Name), Quantity, UnitPrice, Status (Paid/Unpaid)."
        };
      case 'inventory':
        return {
          filename: "divine_inventory_template.csv",
          headers: ["Name", "Sku", "Category", "Brand", "Manufacturer", "UnitPrice", "PurchasePrice", "GstRate", "ReorderLevel", "CurrentStock", "WarehouseLocation", "BatchNumber", "ExpiryDate"],
          examples: [
            ["DispoVan Syringe 10ml", "DS-CO-SV10", "Consumables", "DispoVan", "Hindustan Syringes Ltd.", "15", "8", "12", "1500", "5000", "Aisle A1 - Rack 3", "DV260613", "2029-06-15"],
            ["AccuChek Active Test Strip Box", "DS-DM-AC50", "Diagnostics", "AccuChek", "Roche Diabetes", "1050", "750", "18", "100", "250", "Aisle B1 - Shelf 2", "RC88219", "2028-09-30"]
          ],
          guide: "Required: Name, Sku, UnitPrice, PurchasePrice, GstRate, CurrentStock. Other fields can be left blank."
        };
    }
  };

  const downloadCSVTemplate = () => {
    const meta = getTemplateMeta();
    let csvContent = "\ufeff"; // UTF-8 BOM representation for beautiful Microsoft Excel alignment
    csvContent += meta.headers.join(",") + "\n";
    meta.examples.forEach(row => {
      const sanitized = row.map(cell => {
        // Wrap string contain commas in standard quotes
        if (cell.includes(",")) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
      csvContent += sanitized.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", meta.filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentCell = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"'; // Escaped quote
          i++;
        } else {
          inQuotes = !inQuotes; // Toggle quote state
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        row.push(currentCell.trim());
        if (row.some(cell => cell !== "")) {
          lines.push(row);
        }
        row = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    if (currentCell || row.length > 0) {
      row.push(currentCell.trim());
      if (row.some(cell => cell !== "")) {
        lines.push(row);
      }
    }
    return lines;
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setValidationErrors([]);
    setSuccessCount(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;

      const records = parseCSV(text);
      if (records.length < 2) {
        setValidationErrors(["The spreadsheet file does not appear to contain any data rows beyond headers."]);
        return;
      }

      const fileHeaders = records[0].map(h => h.trim());
      setHeaders(fileHeaders);

      const meta = getTemplateMeta();
      // Check required headers to alert
      const missingRequired = meta.headers.filter(expected => 
        !fileHeaders.some(actual => actual.toLowerCase() === expected.toLowerCase())
      );

      if (missingRequired.length > 0) {
        setValidationErrors([
          `Missing columns: ${missingRequired.join(", ")}. Ensure you align columns directly to the Divine Surgicals template framework.`
        ]);
        return;
      }

      // Parse records based on meta headers Index
      const parsedItems: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < records.length; i++) {
        const rowData = records[i];
        if (rowData.length < fileHeaders.length && rowData.length === 1 && rowData[0] === "") {
          continue; // skip trailing empty rows
        }

        const parsedItemObj: Record<string, string> = {};
        fileHeaders.forEach((h, idx) => {
          parsedItemObj[h] = rowData[idx] || "";
        });

        // Specific structural validations
        if (type === 'customers') {
          const nameVal = parsedItemObj["Name"];
          const mobileVal = parsedItemObj["Mobile"];
          if (!nameVal) {
            errors.push(`Row ${i}: Customer 'Name' field is empty.`);
          }
          if (!mobileVal) {
            errors.push(`Row ${i}: Customer 'Mobile' field is empty.`);
          }
        } else if (type === 'suppliers') {
          const nameVal = parsedItemObj["Name"];
          const mobileVal = parsedItemObj["MobileNumber"];
          if (!nameVal) {
            errors.push(`Row ${i}: Supplier Name field is empty.`);
          }
          if (!mobileVal) {
            errors.push(`Row ${i}: Supplier MobileNumber is required.`);
          }
        } else if (type === 'purchases') {
          const poNum = parsedItemObj["PONumber"];
          const suppName = parsedItemObj["SupplierName"];
          const skuVal = parsedItemObj["ProductSku"];
          const qtyVal = Number(parsedItemObj["Quantity"]);

          if (!poNum) errors.push(`Row ${i}: PONumber must be provided.`);
          if (!suppName) errors.push(`Row ${i}: SupplierName must be provided.`);
          if (!skuVal) errors.push(`Row ${i}: Product SKU value is blank.`);
          if (isNaN(qtyVal) || qtyVal <= 0) errors.push(`Row ${i}: Quantity must be a positive integer.`);
        } else if (type === 'sales') {
          const invNum = parsedItemObj["InvoiceNumber"];
          const custName = parsedItemObj["CustomerName"];
          const skuOrName = parsedItemObj["ProductSkuOrName"];
          const qtyVal = Number(parsedItemObj["Quantity"]);
          const grPrice = Number(parsedItemObj["UnitPrice"]);

          if (!invNum) errors.push(`Row ${i}: InvoiceNumber is required.`);
          if (!custName) errors.push(`Row ${i}: CustomerName cannot be blank.`);
          if (!skuOrName) errors.push(`Row ${i}: Product SKU/Name is required.`);
          if (isNaN(qtyVal) || qtyVal <= 0) errors.push(`Row ${i}: Quantity is invalid.`);
          if (isNaN(grPrice) || grPrice < 0) errors.push(`Row ${i}: UnitPrice must be numeric.`);
        } else if (type === 'inventory') {
          const nameVal = parsedItemObj["Name"];
          const skuVal = parsedItemObj["Sku"];
          const upVal = Number(parsedItemObj["UnitPrice"]);
          const ppVal = Number(parsedItemObj["PurchasePrice"]);
          const gstVal = Number(parsedItemObj["GstRate"]);
          const stockVal = Number(parsedItemObj["CurrentStock"]);

          if (!nameVal) errors.push(`Row ${i}: Inventory product Name cannot be blank.`);
          if (!skuVal) errors.push(`Row ${i}: SKU code must be provided.`);
          if (isNaN(upVal) || upVal < 0) errors.push(`Row ${i}: UnitPrice must be a positive number.`);
          if (isNaN(ppVal) || ppVal < 0) errors.push(`Row ${i}: PurchasePrice must be a positive number.`);
          if (isNaN(gstVal) || gstVal < 0) errors.push(`Row ${i}: GstRate must be a positive number.`);
          if (isNaN(stockVal) || stockVal < 0) errors.push(`Row ${i}: CurrentStock must be a non-negative integer.`);
        }

        parsedItemObj._rowIdx = (i + 1).toString();
        // Convert camelcase headers map for ease of use
        const normalizedItem: Record<string, any> = {};
        Object.entries(parsedItemObj).forEach(([rawKey, val]) => {
          const normKey = rawKey.charAt(0).toLowerCase() + rawKey.slice(1).replace(/\s+/g, "");
          normalizedItem[normKey] = val;
        });
        parsedItems.push(normalizedItem);
      }

      setParsedRows(parsedItems);
      if (errors.length > 0) {
        setValidationErrors(errors.slice(0, 10)); // Top 10 errors
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleCommitImport = () => {
    if (parsedRows.length === 0 || validationErrors.length > 0) return;
    onImport(parsedRows);
    setSuccessCount(parsedRows.length);
    setFile(null);
    setParsedRows([]);
  };

  const meta = getTemplateMeta();

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mt-4 space-y-4 font-sans text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 text-emerald-700 p-2 rounded-lg">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h4 className="text-[12px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              Bulk Spreadsheet Import Master 
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">1000+ SKU Compatible</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Upload Microsoft Excel formulas / offline CSV tables directly to create batch records.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-150 border border-slate-250 font-bold rounded-lg cursor-pointer flex items-center gap-1 text-slate-600 transition text-[10px]"
          >
            <Info size={13} />
            <span>Format Guidelines</span>
          </button>
          
          <button
            onClick={downloadCSVTemplate}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1 text-[10px] transition"
          >
            <Download size={13} />
            <span>Get Excel Template</span>
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="bg-blue-50 border border-blue-200/55 p-3 rounded-xl space-y-1.5 animate-fade-in">
          <p className="font-bold text-[#0F4C81] flex items-center gap-1 text-[10.5px]">
            <Sparkles size={13} /> Corporate Workbook Integration Guide:
          </p>
          <p className="text-slate-600 leading-normal">{meta.guide}</p>
          <div className="border-t border-blue-100 pt-1.5 mt-1">
            <p className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Compliant Headers Expected:</p>
            <code className="text-blue-900 font-mono text-[10px] bg-white/70 px-1.5 py-0.5 rounded block mt-0.5 overflow-x-auto whitespace-nowrap">
              {meta.headers.join(" , ")}
            </code>
          </div>
        </div>
      )}

      {/* DRAG AND DROP ZONE */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2
          ${dragActive ? "border-emerald-500 bg-emerald-50/40" : "border-slate-250 bg-white hover:border-[#0F4C81]"}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          accept=".csv" 
          className="hidden" 
        />
        
        <div className="p-3 bg-slate-50 rounded-full text-slate-400 group-hover:text-emerald-500 transition">
          <Upload size={22} className="mx-auto" />
        </div>
        
        {file ? (
          <div>
            <p className="text-xs font-bold text-[#0F4C81]">{file.name}</p>
            <p className="text-[10px] text-slate-400">File detected and loaded • {(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-slate-700">Drag & drop your formatted spreadsheet CSV file</p>
            <p className="text-[10px] text-slate-400 mt-1">or click to browse your workstation folders. Standard Microsoft Excel CSV files are supported.</p>
          </div>
        )}
      </div>

      {/* FEEDBACK STATUS & VALIDATION RESULTS */}
      {successCount !== null && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-1.5">
            <CheckCircle size={16} className="text-emerald-600" />
            Bulk committed {successCount} elements securely to active ERP databases. All ledger stats synchronized.
          </span>
          <button onClick={() => setSuccessCount(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 animate-fade-in">
          <p className="font-bold text-rose-800 flex items-center gap-1">
            <AlertTriangle size={15} /> Alignment Errors Detected ({validationErrors.length})
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-rose-700">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
          <p className="text-[9px] text-rose-500">Correct details in Microsoft Excel, download as CSV, and re-upload.</p>
        </div>
      )}

      {/* PREVIEW OF VALIDATED ROWS */}
      {parsedRows.length > 0 && validationErrors.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
          <div className="p-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
            <span className="font-bold text-slate-700">{parsedRows.length} potential rows qualified for import</span>
            <span className="text-[9px] text-[#28A745] font-bold flex items-center gap-1">
              ✓ Ready for commit
            </span>
          </div>
          
          <div className="overflow-x-auto max-h-40 text-[10px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 font-bold text-slate-500 border-b border-slate-150">
                  <th className="p-1.5 pl-3"># Row</th>
                  {meta.headers.slice(0, 4).map((h, i) => (
                    <th key={i} className="p-1.5">{h}</th>
                  ))}
                  <th className="p-1.5 pr-3">...</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="p-1.5 pl-3 font-mono text-slate-400">Row {row._rowIdx || idx + 2}</td>
                    {meta.headers.slice(0, 4).map((h, i) => {
                      const lowerKey = h.charAt(0).toLowerCase() + h.slice(1).replace(/\s+/g, "");
                      return (
                        <td key={i} className="p-1.5 max-w-[120px] truncate">{row[lowerKey] || "-"}</td>
                      );
                    })}
                    <td className="p-1.5 pr-3 text-slate-300">...</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 5 && (
              <p className="p-1 text-center font-bold text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50/50">
                + {parsedRows.length - 5} other spreadsheet rows parsed successfully ...
              </p>
            )}
          </div>

          <div className="p-3 border-t border-slate-150 bg-slate-50/50 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setFile(null);
                setParsedRows([]);
              }}
              className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-100 rounded-lg text-slate-600 font-bold transition cursor-pointer"
            >
              Discard File
            </button>
            <button
              onClick={handleCommitImport}
              className="px-4 py-1.5 bg-[#0F4C81] hover:bg-opacity-95 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Commit bulk rows securely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
