import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { ERPData, Product, InventoryLog, Supplier, PurchaseOrder, Customer, SalesInvoice, FinancialRecord, ActivityLog, SyncStatus, UserRole } from "./src/types";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data-store.json");

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini SDK initialized successfully");
  } catch (err) {
    console.error("Failed to initialize Gemini SDK:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY environment variable found. The AI Assistant will operate in simulation mode.");
}

// Generate default mock data representing a real business in Silchar, Assam, India
const generateDefaultData = (): ERPData => {
  const now = new Date();

  const products: Product[] = [
    {
      id: "prod-1",
      name: "DispoVan Disposable Syringe 5ml (Needle 24G)",
      sku: "DS-CO-SV05",
      category: "Consumables",
      brand: "DispoVan",
      manufacturer: "Hindustan Syringes & Medical Devices Ltd.",
      unitPrice: 12.00,
      purchasePrice: 6.50,
      gstRate: 12,
      reorderLevel: 2000,
      currentStock: 4500,
      warehouseLocation: "Aisle A1 - Rack 2",
      batchNumber: "DV260401",
      expiryDate: "2029-04-15"
    },
    {
      id: "prod-2",
      name: "Nitrile Sterile Surgical Gloves Size 7.5",
      sku: "DS-CO-NG75",
      category: "Consumables",
      brand: "SurgiSafe",
      manufacturer: "Safeshield Healthcare Ltd.",
      unitPrice: 85.00,
      purchasePrice: 42.00,
      gstRate: 12,
      reorderLevel: 1000,
      currentStock: 800, // Low stock trigger
      warehouseLocation: "Aisle A2 - Rack 4",
      batchNumber: "NS260212",
      expiryDate: "2028-11-30"
    },
    {
      id: "prod-3",
      name: "Titanium Orthopedic Distal Radius Locking Plate 2.4mm",
      sku: "DS-IM-LP24",
      category: "Orthopedic Implants",
      brand: "HindOrth",
      manufacturer: "Hindustan Ortho Implants Pvt Ltd.",
      unitPrice: 4200.00,
      purchasePrice: 2100.00,
      gstRate: 18,
      reorderLevel: 15,
      currentStock: 32,
      warehouseLocation: "Cabinet C1 - Locker 2",
      batchNumber: "HOI-TR114",
      expiryDate: "2031-01-10"
    },
    {
      id: "prod-4",
      name: "Philips Respironics EverFlo 5L Oxygen Concentrator",
      sku: "DS-EQ-PR05",
      category: "Respiratory Equipments",
      brand: "Philips",
      manufacturer: "Philips Respironics Inc.",
      unitPrice: 58000.00,
      purchasePrice: 48000.00,
      gstRate: 12,
      reorderLevel: 5,
      currentStock: 3, // Low stock trigger
      warehouseLocation: "Heavy Equipment Storage Sec B",
      batchNumber: "PR-EF8231",
      expiryDate: "2031-10-01"
    },
    {
      id: "prod-5",
      name: "Omron HEM-7120 Fully Automatic Blood Pressure Monitor",
      sku: "DS-DM-OM71",
      category: "Diagostics & Monitors",
      brand: "Omron",
      manufacturer: "Omron Healthcare India Pvt. Ltd.",
      unitPrice: 2450.00,
      purchasePrice: 1750.00,
      gstRate: 18,
      reorderLevel: 50,
      currentStock: 120,
      warehouseLocation: "Aisle B1 - Shelf 1",
      batchNumber: "OM-9921D",
      expiryDate: "2030-05-15"
    },
    {
      id: "prod-6",
      name: "Contec CMS5000 Multiparameter Patient Monitor",
      sku: "DS-DM-CT50",
      category: "Diagostics & Monitors",
      brand: "Contec",
      manufacturer: "Contec Medical Systems Co. Ltd.",
      unitPrice: 28500.00,
      purchasePrice: 19500.00,
      gstRate: 18,
      reorderLevel: 5,
      currentStock: 2, // Low stock trigger
      warehouseLocation: "Aisle B3 - Shelf 4",
      batchNumber: "CT-C5M02",
      expiryDate: "2029-08-20"
    },
    {
      id: "prod-7",
      name: "Romsons IV Cannula Venocan 20G Pink",
      sku: "DS-CO-VC20",
      category: "Consumables",
      brand: "Romsons",
      manufacturer: "Romsons Scientific & Surgical Pvt. Ltd.",
      unitPrice: 35.00,
      purchasePrice: 14.50,
      gstRate: 12,
      reorderLevel: 3000,
      currentStock: 0, // Out of stock trigger
      warehouseLocation: "Aisle A1 - Rack 4",
      batchNumber: "RM-20G12A",
      expiryDate: "2026-05-12" // Expired trigger
    },
    {
      id: "prod-8",
      name: "Foley Balloon Catheter 2-Way Size 16 FR",
      sku: "DS-CO-FL16",
      category: "Consumables",
      brand: "Romsons",
      manufacturer: "Romsons Scientific & Surgical Pvt. Ltd.",
      unitPrice: 110.00,
      purchasePrice: 55.00,
      gstRate: 12,
      reorderLevel: 200,
      currentStock: 45, // Low stock trigger
      warehouseLocation: "Aisle A3 - Shelf 2",
      batchNumber: "FC8812B",
      expiryDate: "2026-07-28" // Near Expiry trigger
    }
  ];

  const inventoryLogs: InventoryLog[] = [
    {
      id: "log-1",
      productId: "prod-1",
      productName: "DispoVan Disposable Syringe 5ml (Needle 24G)",
      sku: "DS-CO-SV05",
      actionType: "Add Stock",
      quantity: 5000,
      date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      user: "Amit Roy (Store Manager)",
      notes: "Received consignment from Hindustan Syringes Guwahati division."
    },
    {
      id: "log-2",
      productId: "prod-7",
      productName: "Romsons IV Cannula Venocan 20G Pink",
      sku: "DS-CO-VC20",
      actionType: "Expired Stock Entry",
      quantity: 80,
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      user: "Amit Roy (Store Manager)",
      notes: "80 units expired on May 12, 2026, removed from sellable stock."
    }
  ];

  const suppliers: Supplier[] = [
    {
      id: "supp-1",
      name: "Surgiplus Distributors Guwahati",
      contactPerson: "Pranab Barman",
      mobileNumber: "9435012345",
      email: "contact@surgiplusghy.com",
      gstNumber: "18AABCS9912D1ZS",
      address: "G.S. Road, Near Ulubari Flyover, Guwahati, Assam - 781007",
      paymentTerms: "Net 30",
      outstandingPayments: 48000.00,
      performanceScore: 92,
      preferred: true,
      ledger: [
        {
          id: "led-s1-1",
          date: "2026-05-18",
          type: "Purchase Invoice",
          referenceId: "po-1",
          amount: 48000.00,
          balanceAfter: 48000.00,
          description: "Purchase Order DS-PO-26001 Received"
        }
      ]
    },
    {
      id: "supp-2",
      name: "Care Surgicals New Delhi",
      contactPerson: "Vihaan Sharma",
      mobileNumber: "9811054321",
      email: "billing@caresurgicalsdelhi.in",
      gstNumber: "07AAACR4412F1Z6",
      address: "Sector 3, Rohini, New Delhi - 110085",
      paymentTerms: "Net 60",
      outstandingPayments: 0.00,
      performanceScore: 85,
      preferred: false,
      ledger: []
    },
    {
      id: "supp-3",
      name: "Brahmaputra Biotech & Implants Guwahati",
      contactPerson: "Dhruba Jyoti Das",
      mobileNumber: "7002155694",
      email: "sales@brahmaputrabiotech.com",
      gstNumber: "18AABCB1234E1ZP",
      address: "Borpukhuri Road, Uzanbazar, Guwahati, Assam - 781001",
      paymentTerms: "COD",
      outstandingPayments: 19500.00,
      performanceScore: 78,
      preferred: true,
      ledger: [
        {
          id: "led-s3-1",
          date: "2026-06-02",
          type: "Purchase Invoice",
          referenceId: "po-3",
          amount: 19500.00,
          balanceAfter: 19500.00,
          description: "Patient Monitors Consignment Received"
        }
      ]
    }
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "po-1",
      poNumber: "DS-PO-26001",
      supplierId: "supp-1",
      supplierName: "Surgiplus Distributors Guwahati",
      items: [
        {
          productId: "prod-4",
          name: "Philips Respironics EverFlo 5L Oxygen Concentrator",
          sku: "DS-EQ-PR05",
          quantity: 1,
          purchasePrice: 48000.00,
          gstRate: 12,
          totalGst: 5760.00,
          totalAmount: 53760.00
        }
      ],
      orderDate: "2026-05-18",
      status: "Received",
      totalAmount: 53760.00,
      totalGst: 5760.00,
      notes: "Expedited shipping requested for Silchar branch.",
      approvedBy: "Debasish Chakraborty (Owner)",
      approvedAt: "2026-05-18",
      receivedBy: "Amit Roy (Store Manager)",
      receivedAt: "2026-05-22",
      billNumber: "SPD/GHY/26-904"
    },
    {
      id: "po-2",
      poNumber: "DS-PO-26002",
      supplierId: "supp-2",
      supplierName: "Care Surgicals New Delhi",
      items: [
        {
          productId: "prod-2",
          name: "Nitrile Sterile Surgical Gloves Size 7.5",
          sku: "DS-CO-NG75",
          quantity: 100,
          purchasePrice: 42.00,
          gstRate: 12,
          totalGst: 504.00,
          totalAmount: 4704.00
        }
      ],
      orderDate: "2026-06-15",
      status: "Approved",
      totalAmount: 4704.00,
      totalGst: 504.00,
      notes: "Stock reorder of critical gloves size.",
      approvedBy: "Debasish Chakraborty (Owner)",
      approvedAt: "2026-06-16"
    },
    {
      id: "po-3",
      poNumber: "DS-PO-26003",
      supplierId: "supp-3",
      supplierName: "Brahmaputra Biotech & Implants Guwahati",
      items: [
        {
          productId: "prod-6",
          name: "Contec CMS5000 Multiparameter Patient Monitor",
          sku: "DS-DM-CT50",
          quantity: 1,
          purchasePrice: 19500.00,
          gstRate: 18,
          totalGst: 3510.00,
          totalAmount: 23010.00
        }
      ],
      orderDate: "2026-06-01",
      status: "Received",
      totalAmount: 23010.00,
      totalGst: 3510.00,
      notes: "Demo model for regional sales clinic.",
      approvedBy: "Debasish Chakraborty (Owner)",
      approvedAt: "2026-06-01",
      receivedBy: "Amit Roy (Store Manager)",
      receivedAt: "2026-06-02",
      billNumber: "BB-983"
    }
  ];

  const customers: Customer[] = [
    {
      id: "cust-1",
      name: "Silchar Medical College & Hospital (SMCH)",
      mobile: "9435061234",
      email: "finance@smchhospital.org",
      address: "SMCH Road, Ghungoor, Silchar, Assam - 788014",
      gstNumber: "18AAAGS8801H1Z2",
      outstandingPayments: 145000.00,
      creditLimit: 500000.00,
      lifetimeValue: 845000.00
    },
    {
      id: "cust-2",
      name: "Valley Hospital & Research Centre Silchar",
      mobile: "03842240101",
      email: "valleyhospitalsilchar@gmail.com",
      address: "Meherpur, Silchar, Cachar District, Assam - 788015",
      gstNumber: "18AABCV4921J1ZN",
      outstandingPayments: 45800.00,
      creditLimit: 200000.00,
      lifetimeValue: 325400.00
    },
    {
      id: "cust-3",
      name: "Green Heals Hospital Silchar",
      mobile: "7002011223",
      email: "info@greenheals.com",
      address: "Link Road, Silchar, Assam - 788006",
      gstNumber: "18AACSG8112A1ZS",
      outstandingPayments: 0.00,
      creditLimit: 150000.00,
      lifetimeValue: 120000.00
    }
  ];

  const salesInvoices: SalesInvoice[] = [
    {
      id: "inv-1",
      invoiceNumber: "DS-INV-26001",
      customerId: "cust-1",
      customerName: "Silchar Medical College & Hospital (SMCH)",
      customerMobile: "9435061234",
      customerGst: "18AAAGS8801H1Z2",
      customerState: "Assam",
      items: [
        {
          productId: "prod-3",
          name: "Titanium Orthopedic Distal Radius Locking Plate 2.4mm",
          sku: "DS-IM-LP24",
          quantity: 10,
          unitPrice: 4200.00,
          gstRate: 18,
          gstAmount: 7560.00,
          cgstAmount: 3780.00,
          sgstAmount: 3780.00,
          igstAmount: 0,
          totalAmount: 49560.00
        },
        {
          productId: "prod-5",
          name: "Omron HEM-7120 Fully Automatic Blood Pressure Monitor",
          sku: "DS-DM-OM71",
          quantity: 20,
          unitPrice: 2450.00,
          gstRate: 18,
          gstAmount: 8820.00,
          cgstAmount: 4410.00,
          sgstAmount: 4410.00,
          igstAmount: 0,
          totalAmount: 57820.00
        }
      ],
      subtotal: 91000.00,
      totalGst: 16380.00,
      totalCgst: 8190.00,
      totalSgst: 8190.00,
      totalIgst: 0,
      grandTotal: 107380.00,
      discount: 0,
      date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: "Bank Transfer",
      status: "Paid",
      createdBy: "Sanjay Dutta (Accountant)"
    },
    {
      id: "inv-2",
      invoiceNumber: "DS-INV-26002",
      customerId: "cust-2",
      customerName: "Valley Hospital & Research Centre Silchar",
      customerMobile: "03842240101",
      customerGst: "18AABCV4921J1ZN",
      customerState: "Assam",
      items: [
        {
          productId: "prod-1",
          name: "DispoVan Disposable Syringe 5ml (Needle 24G)",
          sku: "DS-CO-SV05",
          quantity: 1000,
          unitPrice: 12.00,
          gstRate: 12,
          gstAmount: 1440.00,
          cgstAmount: 720.00,
          sgstAmount: 720.00,
          igstAmount: 0,
          totalAmount: 13440.00
        },
        {
          productId: "prod-4",
          name: "Philips Respironics EverFlo 5L Oxygen Concentrator",
          sku: "DS-EQ-PR05",
          quantity: 2,
          unitPrice: 58000.00,
          gstRate: 12,
          gstAmount: 13920.00,
          cgstAmount: 6960.00,
          sgstAmount: 6960.00,
          igstAmount: 0,
          totalAmount: 129920.00
        }
      ],
      subtotal: 128000.00,
      totalGst: 15360.00,
      totalCgst: 7680.00,
      totalSgst: 7680.00,
      totalIgst: 0,
      grandTotal: 143360.00,
      discount: 1500.00, // Direct discount
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: "Bank Transfer",
      status: "Unpaid",
      createdBy: "Joydeep Sen (Sales Executive)"
    }
  ];

  const financialRecords: FinancialRecord[] = [
    {
      id: "fin-1",
      type: "Income",
      category: "Sales Revenue",
      amount: 107380.00,
      gstImpact: 16380.00,
      date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "Payment received against Invoice DS-INV-26001 from SMCH",
      referenceId: "inv-1"
    },
    {
      id: "fin-2",
      type: "Expense",
      category: "Purchase Expense",
      amount: 48000.00,
      gstImpact: 5760.00,
      date: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "Paid Surgiplus Distributors Guwahati for EverFlo 5L (PO-1)",
      referenceId: "po-1"
    },
    {
      id: "fin-3",
      type: "Expense",
      category: "Rent",
      amount: 15000.00,
      gstImpact: 2700.00,
      date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "Rent for Central Store showroom - National Highway, Silchar",
      referenceId: ""
    }
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: "act-1",
      userId: "user-owner",
      userName: "Debasish Chakraborty",
      userRole: "Owner",
      module: "User",
      action: "Logged into Divine Surgicals ERP Master Terminal",
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "act-2",
      userId: "user-manager",
      userName: "Amit Roy",
      userRole: "Manager",
      module: "Inventory",
      action: "Updated Stock for Nitrile Sterile Surgical Gloves to 800",
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const syncStatus: SyncStatus = {
    lastSyncedText: "Synchronized",
    lastSyncedTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    status: "synced",
    source: "OneDrive",
    log: [
      {
        id: "sync-log-1",
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        action: "Two-way full database check completed",
        sheetName: "DivineSurgicals_ERP.xlsx",
        rowsCount: 8,
        type: "download"
      },
      {
        id: "sync-log-2",
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        action: "Exported current invoice logs to OneDrive",
        sheetName: "DivineSurgicals_ERP.xlsx",
        rowsCount: 2,
        type: "upload"
      }
    ]
  };

  return {
    products,
    inventoryLogs,
    suppliers,
    purchaseOrders,
    customers,
    salesInvoices,
    financialRecords,
    activityLogs,
    syncStatus,
    users: [
      { id: "user-owner", name: "Debasish Chakraborty", username: "debasish", role: "Owner" as UserRole, email: "owner@divinesurgicals.com", pin: "1111" },
      { id: "user-manager", name: "Amit Roy", username: "amit", role: "Manager" as UserRole, email: "amit.manager@divinesurgicals.com", pin: "2222" },
      { id: "user-accountant", name: "Sanjay Dutta", username: "sanjay", role: "Accountant" as UserRole, email: "sanjay.accounts@divinesurgicals.com", pin: "3333" },
      { id: "user-sales", name: "Joydeep Sen", username: "joydeep", role: "Sales Executive" as UserRole, email: "joydeep.sales@divinesurgicals.com", pin: "4444" }
    ],
    rolePermissions: {
      "Owner": ["dashboard", "inventory", "purchases", "sales", "suppliers", "customers", "finance", "reports", "employees", "ai-assistant", "settings"],
      "Manager": ["dashboard", "inventory", "purchases", "suppliers", "customers", "reports", "ai-assistant"],
      "Accountant": ["dashboard", "purchases", "sales", "suppliers", "customers", "finance", "reports", "ai-assistant"],
      "Sales Executive": ["dashboard", "inventory", "sales", "customers", "ai-assistant"]
    }
  };
};

// Help load/save database state in JSON file
const loadERPData = (): ERPData => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content) as ERPData;
      
      let updated = false;
      if (!parsed.users || !Array.isArray(parsed.users)) {
         parsed.users = [
          { id: "user-owner", name: "Debasish Chakraborty", username: "debasish", role: "Owner", email: "owner@divinesurgicals.com", pin: "1111" },
          { id: "user-manager", name: "Amit Roy", username: "amit", role: "Manager", email: "amit.manager@divinesurgicals.com", pin: "2222" },
          { id: "user-accountant", name: "Sanjay Dutta", username: "sanjay", role: "Accountant", email: "sanjay.accounts@divinesurgicals.com", pin: "3333" },
          { id: "user-sales", name: "Joydeep Sen", username: "joydeep", role: "Sales Executive", email: "joydeep.sales@divinesurgicals.com", pin: "4444" }
        ];
        updated = true;
      } else {
        // Ensure every user has a PIN
        parsed.users.forEach(u => {
          if (u.email.toLowerCase() === "gangvidit@gmail.com" || u.id === "user-owner" || u.role === "Owner") {
            u.pin = "2606";
            if (u.email.toLowerCase() !== "gangvidit@gmail.com") {
              u.email = "gangvidit@gmail.com";
              u.name = "Vidit Gang (Owner)";
            }
            updated = true;
          } else if (!u.pin) {
            if (u.id === "user-manager") u.pin = "2222";
            else if (u.id === "user-accountant") u.pin = "3333";
            else if (u.id === "user-sales") u.pin = "4444";
            else u.pin = Math.floor(1000 + Math.random() * 9000).toString(); // random PIN
            updated = true;
          }
        });
      }
      if (!parsed.rolePermissions) {
        parsed.rolePermissions = {
          "Owner": ["dashboard", "inventory", "purchases", "sales", "suppliers", "customers", "finance", "reports", "employees", "ai-assistant", "settings"],
          "Manager": ["dashboard", "inventory", "purchases", "suppliers", "customers", "reports", "ai-assistant"],
          "Accountant": ["dashboard", "purchases", "sales", "suppliers", "customers", "finance", "reports", "ai-assistant"],
          "Sales Executive": ["dashboard", "inventory", "sales", "customers", "ai-assistant"]
        };
        updated = true;
      }
      if (!parsed.gstNotes) {
        parsed.gstNotes = [];
        updated = true;
      }
      if (!parsed.salesOrders) {
        parsed.salesOrders = [];
        updated = true;
      }
      if (!parsed.deliveryChallans) {
        parsed.deliveryChallans = [];
        updated = true;
      }
      if (!parsed.billingSchemes) {
        parsed.billingSchemes = [
          { id: "scheme-1", name: "Buy 10 Get 1 Free on DispoVan Syringes", type: "BuyXGetY", productIdX: "prod-1", quantityX: 10, productIdY: "prod-1", quantityY: 1, active: true },
          { id: "scheme-2", name: "Flat 10% on Omron Monitors", type: "FlatDiscount", brandTarget: "Omron", discountPercentage: 10, active: true },
          { id: "scheme-3", name: "Romsons Campaign (Mfr-Funded 5%)", type: "ManufacturerFunded", brandTarget: "Romsons", discountPercentage: 5, manufacturerCode: "ROM-MF-05", active: true }
        ];
        updated = true;
      }
      if (!parsed.products.some(p => p.batches && p.batches.length > 0)) {
        parsed.products.forEach(p => {
          if (!p.batches) {
            p.batches = [
              {
                id: `batch-${p.id}-1`,
                batchNumber: p.batchNumber,
                expiryDate: p.expiryDate,
                currentStock: p.currentStock,
                purchasePrice: p.purchasePrice,
                unitPrice: p.unitPrice
              },
              {
                id: `batch-${p.id}-2`,
                batchNumber: p.batchNumber.slice(0, -2) + "99",
                // Set expiry date slightly earlier or soon for testing FEFO
                expiryDate: new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
                currentStock: Math.floor(p.currentStock * 0.4) + 10,
                purchasePrice: p.purchasePrice,
                unitPrice: p.unitPrice
              }
            ];
          }
        });
        updated = true;
      }
      if (updated) {
        saveERPData(parsed);
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse data-store.json, creating a new store:", e);
      const initial = generateDefaultData();
      saveERPData(initial);
      return initial;
    }
  } else {
    const initial = generateDefaultData();
    saveERPData(initial);
    return initial;
  }
};

const saveERPData = (data: ERPData) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save data to data-store.json:", e);
  }
};

// Active in-memory security sessions map
const activeSessions = new Map<string, { user: any; expires: number }>();

// Security identity validation middleware
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token is missing or unauthorized." });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const raw = Buffer.from(decodeURIComponent(token), "base64").toString("utf-8");
    const parsed = JSON.parse(raw);
    
    const session = activeSessions.get(parsed.sessionId);
    if (!session || session.expires < Date.now()) {
      return res.status(401).json({ error: "Workstation session has expired or is invalid." });
    }
    
    req.user = session.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Malformed user credential node." });
  }
};

// API: Google Authentication Endpoint (OAuth URL construction)
app.get("/api/auth/google/url", (req, res) => {
  const redirectOrigin = (req.query.redirect_origin as string) || `https://${req.get('host')}`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${redirectOrigin}/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    access_type: "online",
    prompt: "select_account"
  });

  res.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    hasConfig: !!clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID"
  });
});

// API: Google Authentication Endpoint (OAuth callback handler)
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code } = req.query;
  const origin = `https://${req.get('host')}`;
  const redirectUri = `${origin}/auth/callback`;

  try {
    if (!code) throw new Error("No authorization-grant code was returned from Google.");

    // 1. Exchange authorization code for active Google token
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token transaction rejection: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Query user identity card profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!profileRes.ok) {
      throw new Error("Unable to retrieve Google Profile parameters.");
    }

    const profileData = await profileRes.json();
    const email = profileData.email;
    const name = profileData.name || "Google User";

    // 3. Locate registered operator entry
    const data = loadERPData();
    let matchedUser = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Auto-associate the system owner email gangvidit@gmail.com with Owner role
    if (!matchedUser && email.toLowerCase() === "gangvidit@gmail.com") {
      const owner = data.users.find(u => u.role === "Owner");
      if (owner) {
        owner.email = "gangvidit@gmail.com";
        matchedUser = owner;
      } else {
        matchedUser = {
          id: "user-gangvidit",
          username: "gangvidit",
          name: "Vidit Gang (Owner)",
          role: "Owner",
          email: "gangvidit@gmail.com"
        };
        data.users.push(matchedUser);
      }
      saveERPData(data);
    }

    if (!matchedUser) {
      return res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #F8FBFF; color: #1E293B; margin: 0; padding: 1rem;">
            <div style="background: white; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #E2E8F0; text-align: center; max-width: 440px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.05);">
              <h2 style="color: #EF4444; margin-top: 0; font-size: 1.25rem; font-weight: 800;">Access Denied</h2>
              <p style="font-size: 0.875rem; color: #475569; line-height: 1.6; margin: 1rem 0;">Your Google account <strong>${email}</strong> is not listed as an authorized staff operator in this Divine Surgicals workstation roster.</p>
              <p style="font-size: 0.8125rem; color: #64748B; background: #FAFBFD; border: 1px solid #F1F5F9; padding: 0.75rem; border-radius: 0.75rem; margin-top: 1rem;">Please ask an administrative Owner (Debasish or Vidit) to register your work email in the <strong>Employee & Access</strong> workspace.</p>
              <button onclick="window.close()" style="background: #0F4C81; color: white; padding: 0.625rem 1.5rem; font-size: 0.8125rem; font-weight: bold; border-radius: 0.75rem; border: none; cursor: pointer; margin-top: 1.25rem; box-shadow: 0 4px 6px -1px rgb(15 76 129 / 0.2);">Close This Window</button>
            </div>
          </body>
        </html>
      `);
    }

    // 4. Create active session credentials
    const sessionId = crypto.randomUUID();
    const sessionToken = Buffer.from(JSON.stringify({ sessionId, userId: matchedUser.id, expiry: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64");

    activeSessions.set(sessionId, { user: matchedUser, expires: Date.now() + 24 * 60 * 60 * 1000 });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(matchedUser)},
                token: "${encodeURIComponent(sessionToken)}"
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p style="font-family: system-ui, sans-serif; font-size: 12px; color: #64748B; text-align: center; margin-top: 40vh;">
            Authorized. Initializing workstation node and downloading access matrix...
          </p>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("Callback authentication error:", err);
    res.send(`
      <html>
        <body style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #FFF5F5; margin: 0;">
          <div style="background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #FEB2B2; text-align: center; max-width: 400px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
            <h2 style="color: #C53030; margin-top: 0; font-size: 1.125rem;">OAuth Handshake Rejection</h2>
            <p style="font-size: 0.8125rem; color: #742A2A; font-family: monospace; background: #FFF5F5; padding: 0.5rem; border-radius: 0.5rem; text-align: left; overflow-x: auto; max-height: 100px;">${err.message || err}</p>
            <button onclick="window.close()" style="background: #C53030; color: white; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: bold; border-radius: 0.5rem; border: none; cursor: pointer; margin-top: 1rem;">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }
});

// API: Simulate Google Authentication (For reviewing/testing when keys are missing)
app.post("/api/auth/simulate", (req, res) => {
  const { email, pin } = req.body as { email: string; pin: string };
  if (!email) {
    return res.status(400).json({ error: "Please enter your Google account email." });
  }
  if (!pin) {
    return res.status(400).json({ error: "Please enter your 4-digit Security Passcode (PIN)." });
  }

  const data = loadERPData();
  let matchedUser = data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  
  if (email.trim().toLowerCase() === "gangvidit@gmail.com") {
    if (!matchedUser) {
      // Auto-map Owner to Vidit Gang
      const owner = data.users.find(u => u.role === "Owner" || u.id === "user-owner");
      if (owner) {
        owner.email = "gangvidit@gmail.com";
        owner.name = "Vidit Gang (Owner)";
        owner.pin = "2606";
        matchedUser = owner;
      } else {
        matchedUser = {
          id: "user-owner",
          username: "gangvidit",
          name: "Vidit Gang (Owner)",
          role: "Owner",
          email: "gangvidit@gmail.com",
          pin: "2606"
        };
        data.users.push(matchedUser);
      }
    } else {
      matchedUser.pin = "2606";
      matchedUser.name = "Vidit Gang (Owner)";
      matchedUser.role = "Owner";
    }
    saveERPData(data);
  }

  if (!matchedUser) {
    return res.status(403).json({ error: `Access Denied: The Google account "${email}" is not listed as registered personnel in Divine Surgicals database.` });
  }

  // Check pin matches
  if (matchedUser.pin !== pin.trim()) {
    return res.status(401).json({ error: "Incorrect Security Passcode (PIN). Access Denied." });
  }

  const sessionId = crypto.randomUUID();
  const sessionToken = Buffer.from(JSON.stringify({ sessionId, userId: matchedUser.id, expiry: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64");

  activeSessions.set(sessionId, { user: matchedUser, expires: Date.now() + 24 * 60 * 60 * 1000 });

  res.json({
    success: true,
    user: matchedUser,
    token: sessionToken
  });
});

// API: Identity Verification (Me query)
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token is missing." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const raw = Buffer.from(decodeURIComponent(token), "base64").toString("utf-8");
    const parsed = JSON.parse(raw);

    const session = activeSessions.get(parsed.sessionId);
    if (!session || session.expires < Date.now()) {
      return res.status(401).json({ error: "Session has expired or is invalid." });
    }

    res.json({ user: session.user });
  } catch (err) {
    res.status(401).json({ error: "Malformed user credential." });
  }
});

// API: De-authorize session (Logout)
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const raw = Buffer.from(decodeURIComponent(token), "base64").toString("utf-8");
      const parsed = JSON.parse(raw);
      activeSessions.delete(parsed.sessionId);
    } catch (e) {}
  }
  res.json({ success: true });
});

// API: get all data
app.get("/api/erp/data", requireAuth, (req, res) => {
  const data = loadERPData();
  res.json(data);
});

// API: update all data manually or save states
app.post("/api/erp/data", requireAuth, (req, res) => {
  const incoming = req.body as ERPData;
  if (!incoming || !Array.isArray(incoming.products)) {
    return res.status(400).json({ error: "Invalid ERP data structure." });
  }
  saveERPData(incoming);
  res.json({ success: true, message: "ERP data persisted successfully." });
});

// API: Simulate OneDrive or Google Sheets Sync Trigger
app.post("/api/erp/sync-trigger", requireAuth, (req, res) => {
  const { source, direction } = req.body as { source: 'OneDrive' | 'Google Sheets'; direction: 'upload' | 'download' | 'both' };
  
  const currentData = loadERPData();
  const now = new Date();
  
  // Random counts for realistic sync logs
  const updatedCount = Math.floor(Math.random() * 5) + 1;
  const currentLogId = `sync-log-${Date.now()}`;
  
  const syncAction = direction === 'download' 
    ? `Synchronized. Downloaded sheet structure and synced ${updatedCount} products/stocks` 
    : direction === 'upload'
    ? `Synchronized. Uploaded ${updatedCount} sales invoices to online cloud spreadsheets`
    : `Two-way full database check completed; ${updatedCount} rows synchronized.`;

  currentData.syncStatus = {
    lastSyncedText: "Synchronized",
    lastSyncedTime: now.toISOString(),
    status: "synced",
    source: source || currentData.syncStatus.source,
    log: [
      {
        id: currentLogId,
        timestamp: now.toISOString(),
        action: syncAction,
        sheetName: source === 'OneDrive' ? "DivineSurgicals_ERP.xlsx" : "DivineSurgicals_ERP_Sheet",
        rowsCount: updatedCount,
        type: (direction === 'download' ? 'download' : 'upload') as 'download' | 'upload'
      },
      ...currentData.syncStatus.log
    ].slice(0, 50) // keep last 50 logs
  };

  const auditId = `act-${Date.now()}`;
  currentData.activityLogs = [
    {
      id: auditId,
      userId: "user-terminal",
      userName: "System Sync Node",
      userRole: "Manager",
      module: "Sync",
      action: `Triggered manual two-way sync with ${source}. All rows verified in sync.`,
      timestamp: now.toISOString()
    },
    ...currentData.activityLogs
  ];

  saveERPData(currentData);
  res.json(currentData);
});

// API: Add stock adjustments
app.post("/api/erp/inventory-action", requireAuth, (req, res) => {
  const { productId, actionType, quantity, notes, user } = req.body as {
    productId: string;
    actionType: any;
    quantity: number;
    notes: string;
    user: string;
  };

  const currentData = loadERPData();
  const productIndex = currentData.products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const p = currentData.products[productIndex];
  const originalStock = p.currentStock;
  let newStock = originalStock;

  if (actionType === 'Add Stock' || actionType === 'Transfer Stock' && notes.includes("Incoming")) {
    newStock += quantity;
  } else if (actionType === 'Damaged Stock Entry' || actionType === 'Expired Stock Entry' || actionType === 'Stock Adjustment') {
    // In Stock Adjustment, check if negative, but typically it represents an reduction unless notes specify otherwise
    newStock = Math.max(0, originalStock - quantity);
  } else if (actionType === 'Transfer Stock') {
    newStock = Math.max(0, originalStock - quantity);
  }

  p.currentStock = newStock;
  
  const logId = `log-${Date.now()}`;
  const newLog: InventoryLog = {
    id: logId,
    productId,
    productName: p.name,
    sku: p.sku,
    actionType,
    quantity,
    date: new Date().toISOString(),
    user,
    notes
  };

  currentData.inventoryLogs = [newLog, ...currentData.inventoryLogs];

  const auditId = `act-${Date.now()}`;
  currentData.activityLogs = [
    {
      id: auditId,
      userId: "user-action",
      userName: user,
      userRole: "Manager",
      module: "Inventory",
      action: `Executed stock transaction (${actionType}) representing ${quantity} units for SKU: ${p.sku}. Stock changed from ${originalStock} to ${newStock}`,
      timestamp: new Date().toISOString()
    },
    ...currentData.activityLogs
  ];

  saveERPData(currentData);
  res.json(currentData);
});

// API: AI Assistant - Intelligent Chat utilizing the ERP database
app.post("/api/erp/chat", requireAuth, async (req, res) => {
  const { message, chatHistory } = req.body as { message: string; chatHistory?: any[] };
  const currentData = loadERPData();

  // Create a minimal compressed summary of the ERP state for Gemini context
  const lowStock = currentData.products.filter(p => p.currentStock <= p.reorderLevel);
  const outOfStock = currentData.products.filter(p => p.currentStock === 0);
  const expired = currentData.products.filter(p => {
    const expDate = new Date(p.expiryDate);
    const today = new Date();
    return expDate < today;
  });
  
  const nearExpiry = currentData.products.filter(p => {
    const expDate = new Date(p.expiryDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60; // next 60 days
  });

  const totalInventoryValue = currentData.products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
  const outstandingCustomerReceivables = currentData.customers.reduce((acc, c) => acc + c.outstandingPayments, 0);
  const outstandingSupplierPayments = currentData.suppliers.reduce((acc, s) => acc + s.outstandingPayments, 0);

  // Summarize products and categories briefly for model context
  const productsSummary = currentData.products.map(p => 
    `- ${p.name} (${p.sku}): Stock=${p.currentStock}, BuyPrice=₹${p.purchasePrice}, SellPrice=₹${p.unitPrice}, Category=${p.category}, Brand=${p.brand}, Expiry=${p.expiryDate}`
  ).join("\n");

  const supplierSummary = currentData.suppliers.map(s => 
    `- ${s.name}: PendingPay=₹${s.outstandingPayments}, Rating=${s.performanceScore}/100, Pref=${s.preferred ? "YES" : "NO"}`
  ).join("\n");

  const systemInstruction = `
You are the built-in Intelligent AI Agent for "Divine Surgicals", a leading surgical and medical equipment distributor based in Silchar, Assam, India.
Your role is to act as an advanced business consultant, analyzing real ERP data and giving actionable recommendations to the Owner (Debasish Chakraborty), Store Manager (Amit Roy), Accountants, and Sales Staff.

Current Date: 2026-06-19.

Here is the exact real-time snapshot of Divine Surgicals ERP data:
--- BUSINESS OVERVIEW ---
- Total Stock Items Counts: ${currentData.products.length} types of equipment
- Total Estimated Inventory Value (Cost): ₹${totalInventoryValue.toFixed(2)}
- Outstanding Accounts Receivable (Clients): ₹${outstandingCustomerReceivables.toFixed(2)}
- Outstanding Payments Payable (Suppliers): ₹${outstandingSupplierPayments.toFixed(2)}

--- ALERTS & CRITICAL ISSUES ---
- Low Stock Items: ${lowStock.map(p => `${p.name} (Stock: ${p.currentStock}/${p.reorderLevel})`).join(", ") || "None"}
- Out of Stock: ${outOfStock.map(p => p.name).join(", ") || "None"}
- Expired Products: ${expired.map(p => `${p.name} (Batch: ${p.batchNumber}, Expired: ${p.expiryDate})`).join(", ") || "None"}
- Near Expiry (Next 60 Days): ${nearExpiry.map(p => `${p.name} (Batch: ${p.batchNumber}, Exp: ${p.expiryDate})`).join(", ") || "None"}

--- BRAND & PRODUCT ROSTER ---
${productsSummary}

--- SUPPLIERS AND ACCOUNT LIABILITIES ---
${supplierSummary}

--- RECENT REVENUE/EXPENSES ---
- Monthly Sales: ₹${currentData.salesInvoices.filter(i => i.status === "Paid").reduce((acc, i) => acc + i.grandTotal, 0).toFixed(2)}
- Custom recommendations must refer specifically to local medical facilities in Cachar/Silchar, like Silchar Medical College (SMCH), Valley Hospital, Green Heals, or grace clinics.
- Always provide clear, bulleted answers.
- Speak professionally, clearly, and make specific stock recommendations (e.g. telling the manager to place order for low stock gloves to Surgiplus Guwahati, or disposing expired IV Cannula batch RM-20G12A).
- If asked about "predicting stock next month", calculate based on safe currentStock buffer vs reorderLevel.

Give highly customized answers based strictly on this ERP data snapshot. Always format numerical currencies with Indian Rupees (₹).
`;

  if (ai) {
    try {
      const gHistory = (chatHistory || []).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content || h.text }]
      }));

      // Since we need to keep instructions robust, initialize chat with instruction in config
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
        history: gHistory
      });

      const response = await chat.sendMessage({ message: message });
      res.json({ answer: response.text });
    } catch (err: any) {
      console.error("Error communicating with Gemini API:", err);
      res.status(500).json({ error: "Gemini server-side API error: " + err.message });
    }
  } else {
    // Generate intelligent simulated response in case API key is missing
    console.log("Operating in simulation mode for chat response...");
    
    // Simple mock logic for questions
    let reply = "";
    const lower = message.toLowerCase();
    
    if (lower.includes("low") || lower.includes("running low")) {
      reply = `**Critical Stock Level Alert (Low Stock):**\n\nThere are **${lowStock.length}** items currently running low of their safety threshold:\n` +
        lowStock.map(p => `• **${p.name}**\n  - Current Stock: **${p.currentStock} units** (Reorder level limit: ${p.reorderLevel})\n  - Storage Location: ${p.warehouseLocation}\n  - Recommended Supplier: **${p.brand === "Philips" ? "Surgiplus Guwahati" : "Care Surgicals New Delhi"}**`).join("\n\n") +
        `\n\n**Action Advice:** I recommend placing an immediate Purchase Order (PO) to replenish **Nitrile Surgical Gloves Size 7.5** and preparing a restock authorization for Philips EverFlo 5L as we only have 3 left in stock (Silchar region demand is up).`;
    } else if (lower.includes("value") || lower.includes("inventory value")) {
      reply = `**Divine Surgicals Net Inventory Valuation:**\n\n• **Total Assets Value (Purchase Cost):** ₹${totalInventoryValue.toLocaleString('en-IN')}\n• **Total Stock SKU Profiles:** ${currentData.products.length} medical items\n• **Total Inventory Units Registered:** ${currentData.products.reduce((acc, p) => acc + p.currentStock, 0)} units\n\n**Category Split:**\n- Consumables holds 80% volume but only 30% value.\n- Specialized Orthopedic implants and Diagnostic machines hold 70% of total locked capital.\n\n*Optimizing tip: Monitor fast-moving syringe SKU codes which lock the lowest amount of cash but yield consistent daily revenue.*`;
    } else if (lower.includes("supplier") || lower.includes("pending payments") || lower.includes("pay")) {
      reply = `**Supplier Liabilities & Outstanding Invoices:**\n\nWe have a total outstanding payable balance of **₹${outstandingSupplierPayments.toLocaleString('en-IN')}**:\n\n1. **Surgiplus Distributors Guwahati:** ₹48,000.00 (Pending Payment for PO DS-PO-26001 - EverFlo Oxygen Concentrator).\n2. **Brahmaputra Biotech & Implants Guwahati:** ₹19,500.00 (Pending Payment for Patient monitors consignment).\n\n**Strategic Recommendation:** Balance payments in coordination with your direct receivables from Silchar Medical College (SMCH) which currently owes us ₹1,45,000.00. Use SMCH settlement checks to immediately clear Surgiplus Guwahati to preserve preferred supplier scoring!`;
    } else if (lower.includes("expire") || lower.includes("expiry")) {
      reply = `**Expiry Risk Assessment (Silchar Showroom & Warehouse):**\n\n1. **Expired Products (CRITICAL):**\n   • **Romsons IV Cannula 20G Pink** (Batch: \`RM-20G12A\`). Amount: **0 units in sellable stock** (We quarantined the remaining 80 units during the audit on June 9).\n\n2. **Near Expiry (Next 30-60 Days):**\n   • **Foley Balloon Catheter Size 16 FR** (Batch: \`FC8812B\`). Current stock: **45 units**. Expiry Date: **July 28, 2026** (approx. 39 days left).\n\n**Action Steps:** For the Foley Catheters, initiate immediate flash-discounts to **Grace Hospital** or coordinate immediate swap options with Romsons regional agent in Guwahati to avoid total write-offs.`;
    } else {
      reply = `### Executive Summary for Divine Surgicals (Silchar, Assam)

**Key Financial Indicators:**
*   **Active Inventory Assets:** ₹${totalInventoryValue.toLocaleString('en-IN')} (Cost representation)
*   **Outstanding Receivables:** ₹${outstandingCustomerReceivables.toLocaleString('en-IN')} (SMCH & Valley Hospital)
*   **Pending Accounts Payable:** ₹${outstandingSupplierPayments.toLocaleString('en-IN')}
*   **Operational Sync Status:** Fully synced with MS OneDrive Excel (**DivineSurgicals_ERP.xlsx**).

**Identified AI Opportunities:**
1.  **Replenishment alert:** Reorder sterile Nitrile Gloves (only 800 left, threshold: 1000) from Surgiplus Distributors Guwahati.
2.  **Receivables follow-up:** Reach out to the Silchar Medical College (SMCH) logistics coordinator regarding the long-standing ₹1,45,000.00 due on DS-INV-26001. SMCH constitutes 72% of outstanding cash flow.
3.  **Expiry quarantine:** Formally write-off the quarantine IV Cannula batch RM-20G12A which expired on May 12, 2026, and export the damaged entry to excel sheets.

*Is there anything structural you would like me to prepare for you? You can ask about particular suppliers, customer credits, or request a complete Profit & Loss summary.*`;
    }

    res.json({ answer: reply });
  }
});

// Create full stack Dev/Production servers routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Server middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Divine Surgicals ERP Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
