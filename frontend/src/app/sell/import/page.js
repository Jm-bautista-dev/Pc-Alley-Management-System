"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

const MOCK_CSV_COLUMNS = [
  "order_no",
  "cust_name",
  "date_created",
  "item_sku",
  "quantity",
  "total_price",
  "payment_method",
  "sales_agent"
];

const SYSTEM_FIELDS = [
  { key: "order_id", label: "Order ID / Number", required: true, desc: "Unique identifier for the sale transaction" },
  { key: "customer_name", label: "Customer Name", required: true, desc: "Full name of the purchaser" },
  { key: "date", label: "Transaction Date", required: true, desc: "Date the sale was finalized" },
  { key: "sku", label: "Product SKU", required: true, desc: "Product code matching system inventory" },
  { key: "quantity", label: "Quantity Sold", required: true, desc: "Number of units purchased" },
  { key: "total_amount", label: "Total Amount", required: true, desc: "Total price paid for the item(s)" },
  { key: "payment_method", label: "Payment Method", required: false, desc: "Cash, GCash, Card, Bank Transfer" },
];

export default function ImportPage() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Validation, 4: Ingestion Progress, 5: Complete
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [mappings, setMappings] = useState({
    order_id: "order_no",
    customer_name: "cust_name",
    date: "date_created",
    sku: "item_sku",
    quantity: "quantity",
    total_amount: "total_price",
    payment_method: "payment_method"
  });

  const [validationReport, setValidationReport] = useState(null);
  const [ingestionLogs, setIngestionLogs] = useState([]);
  const [currentLogStep, setCurrentLogStep] = useState(0);
  const [history, setHistory] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("pc_alley_import_history") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveHistory = (updated) => {
    setHistory(updated);
    localStorage.setItem("pc_alley_import_history", JSON.stringify(updated));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx")) {
        setFile(droppedFile);
        showSuccess(`Loaded file: ${droppedFile.name}`);
        setStep(2);
      } else {
        showError("Please upload a CSV or Excel (.xlsx) file.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      showSuccess(`Loaded file: ${selectedFile.name}`);
      setStep(2);
    }
  };

  const handleMappingChange = (fieldKey, value) => {
    setMappings(prev => ({ ...prev, [fieldKey]: value }));
  };

  const startValidation = () => {
    setStep(3);
    setValidationReport({
      totalRows: 148,
      validRows: 142,
      conflicts: [
        { row: 14, field: "sku", value: "RAM-RGB-8G-DDR3", error: "SKU not found in current inventory catalog" },
        { row: 42, field: "quantity", value: "-2", error: "Quantity must be a positive integer" },
        { row: 89, field: "total_amount", value: "FREE", error: "Total amount must be a valid number" },
        { row: 105, field: "order_id", value: "10023", error: "Duplicate Order ID found in existing ledger" },
        { row: 122, field: "customer_name", value: "", error: "Missing required customer name field" },
        { row: 141, field: "date", value: "2026-13-45", error: "Invalid date format" }
      ]
    });
  };

  const startIngestion = () => {
    setStep(4);
    setIngestionLogs([]);
    setCurrentLogStep(0);

    const logSteps = [
      { msg: "Connecting to PC ALLEY secure ledger database...", delay: 800 },
      { msg: "Verifying column mapping schemas and configurations...", delay: 700 },
      { msg: "Ingesting 142 valid sales transactions from file...", delay: 1000 },
      { msg: "Validating inventory count updates for SKU codes...", delay: 800 },
      { msg: "Generating system receipt logs and sales history mappings...", delay: 600 },
      { msg: "Commit transaction complete. Ingestion finished successfully!", delay: 400 }
    ];

    let current = 0;
    const runStep = () => {
      if (current < logSteps.length) {
        setIngestionLogs(prev => [...prev, { text: logSteps[current].msg, type: current === logSteps.length - 1 ? "success" : "info" }]);
        setCurrentLogStep(current + 1);
        setTimeout(() => {
          current++;
          runStep();
        }, logSteps[current].delay);
      } else {
        const newImport = {
          id: Date.now(),
          filename: file?.name || "import_sales_data.csv",
          recordsCount: 142,
          successRate: 95.9,
          user: "Admin User",
          date: new Date().toISOString()
        };
        saveHistory([newImport, ...history]);
        setStep(5);
        showSuccess("Ledger update complete!");
      }
    };

    runStep();
  };

  const resetImport = () => {
    setFile(null);
    setStep(1);
    setValidationReport(null);
    setIngestionLogs([]);
    setCurrentLogStep(0);
  };

  const deleteHistoryItem = (id) => {
    if (confirm("Delete this import record from log history?")) {
      saveHistory(history.filter(h => h.id !== id));
      showSuccess("Import log deleted");
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="IMPORT DATA" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Header */}
          <div className="mb-8">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              LEDGER INTEGRATION
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              IMPORT <span className="text-brand-neonblue">SALES</span>
            </h1>
          </div>

          {/* Stepper Header */}
          <div className="grid grid-cols-5 gap-2 mb-8 bg-brand-surface border border-border rounded-2xl p-4 max-w-4xl">
            {[
              { num: 1, label: "Upload File" },
              { num: 2, label: "Map Columns" },
              { num: 3, label: "Validate Data" },
              { num: 4, label: "Ingest Ledger" },
              { num: 5, label: "Complete" }
            ].map((s) => {
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <div key={s.num} className="flex flex-col items-center text-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    active ? "bg-brand-neonblue text-white shadow-lg shadow-brand-neonblue/20" :
                    completed ? "bg-green-500/20 text-green-500 border border-green-500/30" :
                    "bg-brand-bgbase border border-border text-muted"
                  }`}>
                    {completed ? "✓" : s.num}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider mt-2 hidden sm:inline ${
                    active ? "text-brand-neonblue" : completed ? "text-green-500" : "text-muted"
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="max-w-4xl space-y-8">
            {/* Step 1: Upload File */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface border border-border rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-neonblue/5 blur-[80px] pointer-events-none" />
                <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    dragActive ? "border-brand-neonblue bg-brand-neonblue/5" : "border-border hover:border-brand-neonblue/40"
                  }`}>
                  <input type="file" id="sales-csv-upload" accept=".csv, .xlsx" className="hidden" onChange={handleFileChange} />
                  <label htmlFor="sales-csv-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-16 h-16 bg-brand-bgbase border border-border rounded-2xl flex items-center justify-center text-brand-neonblue mb-4 hover:scale-105 transition-transform">
                      <Upload size={28} />
                    </div>
                    <h3 className="text-base font-bold text-main mb-1">Drag & drop your CSV or Excel file here</h3>
                    <p className="text-xs text-muted mb-4">or click to browse from your computer</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-bgbase border border-border rounded-xl text-[10px] font-black uppercase tracking-wider text-muted hover:text-main transition-colors">
                      <FileText size={12} /> Select .CSV or .XLSX
                    </div>
                  </label>
                </div>
                
                {/* Download Sample */}
                <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-brand-bgbase/40 border border-border/30 text-left">
                  <div>
                    <h4 className="text-xs font-bold text-main">Need a template?</h4>
                    <p className="text-[11px] text-muted">Download our reference spreadsheet format to map data accurately.</p>
                  </div>
                  <a href="#" onClick={(e) => { e.preventDefault(); showSuccess("Sample template downloaded!"); }}
                    className="flex items-center gap-2 px-4 py-2 border border-border text-muted hover:text-main hover:border-brand-neonblue/40 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">
                    <Download size={12} /> Download Template
                  </a>
                </div>
              </motion.div>
            )}

            {/* Step 2: Mapping columns */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface border border-border rounded-3xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-rajdhani font-black uppercase tracking-wider">Map CSV Columns</h3>
                    <p className="text-xs text-muted">Align the fields from your imported spreadsheet with the PC ALLEY ledger catalog.</p>
                  </div>
                  <div className="px-3 py-1 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-neonblue font-mono">
                    File: {file?.name}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {SYSTEM_FIELDS.map(field => (
                    <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-4 rounded-2xl bg-brand-bgbase/50 border border-border/30">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-main">{field.label}</span>
                          {field.required && <span className="text-brand-crimson font-bold text-xs">*</span>}
                        </div>
                        <p className="text-[10px] text-muted">{field.desc}</p>
                      </div>
                      <div className="hidden md:flex justify-center text-muted">
                        <ArrowRight size={14} />
                      </div>
                      <div>
                        <select value={mappings[field.key]} onChange={e => handleMappingChange(field.key, e.target.value)}
                          className="w-full bg-brand-surface border border-border rounded-xl py-2 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue">
                          <option value="">-- Skip Field --</option>
                          {MOCK_CSV_COLUMNS.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button onClick={resetImport}
                    className="flex-1 py-3 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">
                    Cancel & Reset
                  </button>
                  <button onClick={startValidation}
                    className="flex-[2] py-3 bg-brand-neonblue/20 hover:bg-brand-neonblue text-brand-neonblue hover:text-white border border-brand-neonblue/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={12} className="animate-spin-slow" /> Map & Validate
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Validation Report */}
            {step === 3 && validationReport && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6">
                
                {/* Stats overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-brand-surface border border-border rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Total Parsed Rows</p>
                    <p className="text-2xl font-rajdhani font-black text-main">{validationReport.totalRows}</p>
                  </div>
                  <div className="bg-brand-surface border border-border rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Valid Ledger Entries</p>
                    <p className="text-2xl font-rajdhani font-black text-green-500">{validationReport.validRows}</p>
                  </div>
                  <div className="bg-brand-surface border border-border rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Validation Errors</p>
                    <p className="text-2xl font-rajdhani font-black text-brand-crimson">{validationReport.conflicts.length}</p>
                  </div>
                </div>

                {/* Validation detailed breakdown */}
                <div className="bg-brand-surface border border-border rounded-3xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-rajdhani font-black uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="text-brand-crimson" size={16} /> Validation Audit Logs
                    </h3>
                    <span className="text-[10px] text-muted font-bold">Errors must be addressed or will be skipped during ingestion.</span>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-brand-bgbase/60 text-[9px] font-black uppercase tracking-widest text-muted border-b border-border">
                          <th className="py-2.5 px-4">Row</th>
                          <th className="py-2.5 px-4">Field</th>
                          <th className="py-2.5 px-4">Import Value</th>
                          <th className="py-2.5 px-4">Error / Conflict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationReport.conflicts.map((c, i) => (
                          <tr key={i} className="border-b border-border/30 text-xs hover:bg-brand-bgbase/20">
                            <td className="py-2.5 px-4 font-mono font-bold text-muted">#{c.row}</td>
                            <td className="py-2.5 px-4"><code className="bg-brand-bgbase px-1.5 py-0.5 rounded text-[10px] font-mono text-yellow-500 font-bold">{c.field}</code></td>
                            <td className="py-2.5 px-4 font-mono text-brand-crimson font-bold">{c.value || "[Empty]"}</td>
                            <td className="py-2.5 px-4 text-muted font-bold">{c.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button onClick={resetImport}
                      className="flex-1 py-3 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">
                      Discard Import
                    </button>
                    <button onClick={startIngestion}
                      className="flex-[2] py-3 bg-green-500/20 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 size={12} /> Import {validationReport.validRows} Records
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Step 4: Ingestion Stepper Logs */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface border border-border rounded-3xl p-8">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-16 h-16 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-2xl flex items-center justify-center text-brand-neonblue mb-4 relative">
                    <Database size={24} className="animate-pulse" />
                    <div className="absolute inset-0 border-2 border-brand-neonblue rounded-2xl border-t-transparent animate-spin" />
                  </div>
                  <h3 className="text-lg font-rajdhani font-black uppercase tracking-wider">Ingesting Sales Transactions</h3>
                  <p className="text-xs text-muted mb-8 max-w-md">Do not close this page or navigate away. Data is being safely committed to the MySQL database store.</p>
                </div>

                <div className="bg-brand-bgbase border border-border rounded-2xl p-5 font-mono text-xs text-muted space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {ingestionLogs.map((log, idx) => (
                    <div key={idx} className={`flex items-start gap-2 ${log.type === "success" ? "text-green-500 font-bold" : ""}`}>
                      <span className="shrink-0 text-brand-neonblue">→</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Complete Page */}
            {step === 5 && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-surface border border-border rounded-3xl p-8 text-center max-w-lg mx-auto relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[80px] pointer-events-none" />
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest text-green-500">Ingestion Successful</h3>
                <p className="text-xs text-muted mt-2 mb-6">
                  The ledger catalog has been updated with 142 valid sales entries. Inventory counts and sales trend graphs will automatically recalculate.
                </p>
                <div className="flex gap-3">
                  <button onClick={resetImport}
                    className="flex-1 py-3 bg-brand-neonblue/20 hover:bg-brand-neonblue text-brand-neonblue hover:text-white border border-brand-neonblue/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all">
                    Import Another File
                  </button>
                </div>
              </motion.div>
            )}

            {/* Past Import Logs Ledger */}
            {step !== 4 && (
              <div className="bg-brand-surface border border-border rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-rajdhani font-black uppercase tracking-wider">Import Log Ledger</h3>
                    <p className="text-xs text-muted">A history of past external ledger data updates.</p>
                  </div>
                  <Database size={16} className="text-muted/40" />
                </div>

                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-brand-bgbase/40 text-[9px] font-black uppercase tracking-widest text-muted border-b border-border">
                        <th className="py-3.5 px-6">Date & Time</th>
                        <th className="py-3.5 px-6">File Name</th>
                        <th className="py-3.5 px-6">Records</th>
                        <th className="py-3.5 px-6">Success Rate</th>
                        <th className="py-3.5 px-6">Executed By</th>
                        <th className="py-3.5 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-xs text-muted">
                            No imports completed in this session.
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h.id} className="border-b border-border/30 text-xs hover:bg-brand-bgbase/20">
                            <td className="py-3.5 px-6 text-muted">{new Date(h.date).toLocaleString()}</td>
                            <td className="py-3.5 px-6 font-bold text-main">{h.filename}</td>
                            <td className="py-3.5 px-6 text-brand-neonblue font-mono font-bold">+{h.recordsCount} items</td>
                            <td className="py-3.5 px-6">
                              <span className="font-bold text-green-500">{h.successRate}%</span>
                            </td>
                            <td className="py-3.5 px-6 text-muted font-bold">{h.user}</td>
                            <td className="py-3.5 px-6 text-center">
                              <button onClick={() => deleteHistoryItem(h.id)}
                                className="p-1.5 rounded-lg border border-border text-muted hover:text-brand-crimson hover:border-brand-crimson/30 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
