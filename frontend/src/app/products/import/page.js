"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  Loader2, RotateCcw, Zap, Eye, Settings, X, Download, Undo2, Search
} from "lucide-react";

// ── Field alias dictionary for fuzzy matching ──
const FIELD_ALIASES = {
  category: ["category", "category_name", "product_category", "producttype", "item_category", "cat", "type", "product_type", "dept", "department", "group"],
  brand: ["brand", "brand_name", "manufacturer", "make", "mfr", "producer", "label"],
  sku: ["sku", "product_code", "item_code", "code", "barcode", "upc", "ean", "item_sku", "productcode", "itemcode", "stock_code", "article_number"],
  name: ["name", "product_name", "product", "item", "title", "item_name", "product_title", "description_short", "item_description", "productname"],
  variant: ["variant", "variation", "option", "model", "size", "color", "colour", "spec", "configuration", "version", "subtype"],
  price: ["price", "unit_selling_price", "selling_price", "unit_price", "retail_price", "sell_price", "srp", "amount", "cost", "unitprice", "sell", "rate", "unit_cost"],
  stock: ["stock", "current_stock", "quantity", "qty", "available", "on_hand", "inventory", "stock_level", "in_stock", "available_qty", "opening_stock", "beginning_stock"],
  specifications: ["specifications", "specs", "details", "features", "tech_specs", "technical"]
};

const SYSTEM_FIELDS = Object.keys(FIELD_ALIASES);

function computeConfidence(header, fieldKey) {
  const normalized = header.toString().toLowerCase().replace(/[\s_\-\.]+/g, "").trim();
  const aliases = FIELD_ALIASES[fieldKey].map(a => a.replace(/[\s_\-\.]+/g, ""));

  // Exact match
  if (aliases.includes(normalized)) return 100;

  // Substring containment
  for (const alias of aliases) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const longer = Math.max(normalized.length, alias.length);
      const shorter = Math.min(normalized.length, alias.length);
      return Math.round((shorter / longer) * 90);
    }
  }

  // Levenshtein distance for close matches
  for (const alias of aliases) {
    const dist = levenshtein(normalized, alias);
    const maxLen = Math.max(normalized.length, alias.length);
    const similarity = 1 - dist / maxLen;
    if (similarity > 0.6) return Math.round(similarity * 80);
  }

  return 0;
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
}

function autoMapHeaders(headers) {
  const mapping = {};
  const usedFields = new Set();

  // Sort by confidence descending to handle conflicts
  const candidates = [];
  for (const header of headers) {
    for (const field of SYSTEM_FIELDS) {
      const confidence = computeConfidence(header, field);
      if (confidence >= 40) candidates.push({ header, field, confidence });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);

  for (const { header, field, confidence } of candidates) {
    if (!mapping[header] && !usedFields.has(field)) {
      mapping[header] = { field, confidence };
      usedFields.add(field);
    }
  }
  return mapping;
}

const STEPS = ["Upload", "Preview", "Mapping", "Options", "Import"];

export default function ImportProductsPage() {
  const { theme } = useTheme();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [previewSearch, setPreviewSearch] = useState("");

  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  const [options, setOptions] = useState({
    create_missing_categories: true,
    create_missing_brands: true,
    update_existing_products: false,
    skip_duplicates: true,
    merge_stock: false,
    dry_run: false,
    branch_assignment: "all", // 'catalog_only' | 'all' | 'selected'
    auto_publish: true
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(apiUrl("/api/branches"), {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(err => console.error("Error loading branches", err));
  }, []);

  // ── Step 1: File Upload ──
  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      showError("Unsupported file format. Please use .xlsx, .xls, or .csv");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!json.length) {
          showError("The file appears to be empty.");
          return;
        }

        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawData(json);
        setMapping(autoMapHeaders(hdrs));
        setStep(1);
      } catch {
        showError("Failed to parse the file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── Step 4: Execute Import ──
  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);

    // Transform rawData rows to mapped fields
    const mappedProducts = rawData.map((row) => {
      const product = {};
      for (const [header, map] of Object.entries(mapping)) {
        if (map?.field) {
          product[map.field] = row[header];
        }
      }
      return product;
    });

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/products/import"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          products: mappedProducts,
          options: {
            ...options,
            branch_ids: selectedBranches
          }
        })
      });

      const result = await res.json();
      if (res.ok) {
        setImportResult(result);
        setStep(4);
        if (result.dryRunCommitted) {
          showSuccess(result.message);
        }
      } else {
        showError(result.error || "Import failed.");
      }
    } catch {
      showError("Network error during import.");
    }
    setImporting(false);
  };

  // ── Undo Import ──
  const handleUndo = async () => {
    if (!importResult?.createdIds?.length) return;
    showConfirm(
      "Undo Import?",
      `This will permanently delete ${importResult.createdIds.length} newly imported products and their inventory records.`,
      async () => {
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(apiUrl("/api/products/import/undo"), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ createdIds: importResult.createdIds })
          });
          if (res.ok) {
            showSuccess("Import reverted successfully!");
            resetAll();
          } else {
            const data = await res.json();
            showError(data.error || "Undo failed.");
          }
        } catch {
          showError("Network error during undo.");
        }
      }
    );
  };

  const resetAll = () => {
    setStep(0);
    setFileName("");
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setImportResult(null);
    setOptions({
      create_missing_categories: true,
      create_missing_brands: true,
      update_existing_products: false,
      skip_duplicates: true,
      merge_stock: false,
      dry_run: false,
      branch_assignment: "all",
      auto_publish: true
    });
    setSelectedBranches([]);
  };

  const mappedCount = Object.values(mapping).filter(m => m?.field).length;
  const filteredPreviewData = previewSearch
    ? rawData.filter(row => Object.values(row).some(v => v.toString().toLowerCase().includes(previewSearch.toLowerCase())))
    : rawData;

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="IMPORT PRODUCTS" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">Smart Import</motion.h2>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                Excel Product <span className="text-brand-neonblue">Import</span>
              </motion.h1>
            </div>
            {step > 0 && step < 4 && (
              <button onClick={resetAll} className="text-xs font-black uppercase tracking-widest text-muted hover:text-brand-crimson flex items-center gap-2 transition-colors">
                <RotateCcw size={14} /> Start Over
              </button>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  i === step ? 'bg-brand-neonblue text-white shadow-lg shadow-brand-neonblue/20' :
                  i < step ? 'bg-green-500/15 text-green-500' : 'bg-brand-surface text-muted border border-border/50'
                }`}>
                  {i < step ? <CheckCircle2 size={12} /> : <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[9px]">{i + 1}</span>}
                  {s}
                </div>
                {i < STEPS.length - 1 && <ArrowRight size={12} className="text-muted/30 shrink-0" />}
              </div>
            ))}
          </div>

          {/* Step 0: Upload */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="bg-brand-surface border-2 border-dashed border-border/50 hover:border-brand-neonblue rounded-3xl p-12 md:p-16 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <div className="w-20 h-20 rounded-3xl bg-brand-neonblue/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={36} className="text-brand-neonblue" />
                </div>
                <h3 className="text-lg font-black text-main mb-2">Drop your spreadsheet here</h3>
                <p className="text-xs text-muted mb-6">or click to browse files</p>
                <div className="flex items-center gap-3">
                  {["XLSX", "XLS", "CSV"].map(ext => (
                    <span key={ext} className="px-3 py-1.5 bg-brand-bgbase rounded-full text-[10px] font-black text-muted uppercase tracking-widest border border-border/50">{ext}</span>
                  ))}
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files[0])} accept=".xlsx,.xls,.csv" className="hidden" />

              {/* How It Works */}
              <div className="mt-8 bg-brand-surface border border-border/50 rounded-2xl p-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-main mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-brand-neonblue" /> How Smart Import Works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Upload", desc: "Drop your Excel or CSV file" },
                    { title: "Auto-Map", desc: "We detect column names and map them to fields" },
                    { title: "Import", desc: "Confirm and import — with undo support" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-neonblue/15 flex items-center justify-center text-brand-neonblue text-[10px] font-black shrink-0">{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold text-main">{item.title}</p>
                        <p className="text-[10px] text-muted">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Preview */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Eye size={16} className="text-brand-neonblue" />
                    <div>
                      <h3 className="text-sm font-black text-main uppercase tracking-widest">Data Preview</h3>
                      <p className="text-[10px] text-muted">{fileName} — {rawData.length} rows, {headers.length} columns</p>
                    </div>
                  </div>
                  <div className="relative w-48">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Filter rows..."
                      className="w-full bg-brand-bgbase border border-border/50 rounded-full pl-8 pr-3 py-1.5 text-[10px] text-main font-bold outline-none focus:border-brand-neonblue"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-bgbase sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-muted uppercase tracking-wider">#</th>
                        {headers.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreviewData.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-t border-border/30 hover:bg-brand-bgbase/50">
                          <td className="px-4 py-2.5 text-muted font-bold">{i + 1}</td>
                          {headers.map(h => (
                            <td key={h} className="px-4 py-2.5 text-main font-medium whitespace-nowrap max-w-[200px] truncate">{row[h]?.toString() || ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rawData.length > 50 && (
                    <div className="px-6 py-3 text-center text-[10px] text-muted font-bold bg-brand-bgbase border-t border-border/30">
                      Showing first 50 of {rawData.length} rows
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <button onClick={() => setStep(0)} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted hover:text-main border border-border/50 flex items-center gap-2">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={() => setStep(2)} className="bg-brand-neonblue text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 flex items-center gap-2">
                  Column Mapping <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Mapping */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-brand-neonblue" />
                    <div>
                      <h3 className="text-sm font-black text-main uppercase tracking-widest">Column Mapping</h3>
                      <p className="text-[10px] text-muted">{mappedCount} of {headers.length} columns mapped • Review and adjust mappings below</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMapping(autoMapHeaders(headers))}
                    className="text-[10px] font-black text-brand-neonblue uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    <Zap size={10} /> Re-detect
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {headers.map((header) => {
                    const map = mapping[header];
                    const confidence = map?.confidence || 0;
                    const confColor = confidence >= 80 ? "text-green-500" : confidence >= 50 ? "text-amber-500" : "text-muted";
                    const confBg = confidence >= 80 ? "bg-green-500/10" : confidence >= 50 ? "bg-amber-500/10" : "";

                    return (
                      <div key={header} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        map?.field ? 'border-green-500/30 bg-green-500/5' : 'border-border/50 bg-brand-bgbase'
                      }`}>
                        {/* Excel Column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet size={14} className="text-green-600 shrink-0" />
                            <span className="text-xs font-black text-main uppercase tracking-wide truncate">{header}</span>
                          </div>
                          <p className="text-[10px] text-muted mt-0.5 truncate">Sample: {rawData[0]?.[header]?.toString() || "—"}</p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight size={14} className="text-muted/40 shrink-0" />

                        {/* System Field Dropdown */}
                        <div className="flex-1">
                          <select
                            value={map?.field || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMapping(prev => ({
                                ...prev,
                                [header]: val ? { field: val, confidence: val === map?.field ? map.confidence : 100 } : null
                              }));
                            }}
                            className="w-full bg-brand-surface border border-border/50 rounded-lg px-3 py-2 text-xs text-main font-bold outline-none focus:border-brand-neonblue transition-colors appearance-none cursor-pointer"
                          >
                            <option value="">— Skip this column —</option>
                            {SYSTEM_FIELDS.map(f => {
                              const alreadyUsed = Object.entries(mapping).some(([h, m]) => m?.field === f && h !== header);
                              return (
                                <option key={f} value={f} disabled={alreadyUsed}>
                                  {f.charAt(0).toUpperCase() + f.slice(1)} {alreadyUsed ? "(already mapped)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Confidence */}
                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${confBg} ${confColor}`}>
                          {confidence > 0 ? `${confidence}%` : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted hover:text-main border border-border/50 flex items-center gap-2">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={mappedCount < 1} className="bg-brand-neonblue text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 flex items-center gap-2 disabled:opacity-50">
                  Import Options <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Options */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <div className="bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
                  <Settings size={16} className="text-brand-neonblue" />
                  <div>
                    <h3 className="text-sm font-black text-main uppercase tracking-widest">Import Options</h3>
                    <p className="text-[10px] text-muted">Configure how {rawData.length} rows will be imported</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Branch Assignment Section */}
                  <div className="border-b border-border/40 pb-5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-main mb-3">Branch Assignment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: "catalog_only", label: "Global Catalog Only", desc: "Do not create branch stock mappings" },
                        { value: "all", label: "All Branches", desc: "Create stock entries in all active branches" },
                        { value: "selected", label: "Selected Branches", desc: "Only create stock entries in select branches" }
                      ].map(type => (
                        <label key={type.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          options.branch_assignment === type.value ? 'border-brand-neonblue bg-brand-neonblue/5' : 'border-border/50 bg-brand-bgbase'
                        }`}>
                          <input
                            type="radio"
                            name="branch_assignment"
                            value={type.value}
                            checked={options.branch_assignment === type.value}
                            onChange={(e) => setOptions(prev => ({ ...prev, branch_assignment: e.target.value }))}
                            className="mt-0.5 accent-brand-neonblue"
                          />
                          <div>
                            <p className="text-[11px] font-black uppercase text-main">{type.label}</p>
                            <p className="text-[9px] text-muted mt-0.5">{type.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {options.branch_assignment === "selected" && (
                      <div className="mt-4 p-4 bg-brand-bgbase border border-border/50 rounded-xl space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Select Target Branches</p>
                        <div className="flex flex-wrap gap-2">
                          {branches.map(branch => {
                            const isSelected = selectedBranches.includes(branch.id);
                            return (
                              <button
                                key={branch.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBranches(prev =>
                                    isSelected ? prev.filter(id => id !== branch.id) : [...prev, branch.id]
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${
                                  isSelected
                                    ? "bg-brand-neonblue text-white border-brand-neonblue"
                                    : "bg-brand-surface border-border text-muted hover:text-main"
                                }`}
                              >
                                {branch.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Auto Publish Section */}
                  <div className="border-b border-border/40 pb-5">
                    <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      options.auto_publish ? 'border-brand-neonblue/30 bg-brand-neonblue/5' : 'border-border/50 bg-brand-bgbase hover:border-brand-neonblue/20'
                    }`}>
                      <input
                        type="checkbox"
                        checked={options.auto_publish}
                        onChange={(e) => setOptions(prev => ({ ...prev, auto_publish: e.target.checked }))}
                        className="mt-0.5 accent-brand-neonblue w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-bold text-main">Auto Publish Imported Products</p>
                        <p className="text-[10px] text-muted mt-0.5">If checked, products will be immediately visible to branch employees and on POS. Otherwise they require branch managers to manually review and enable them.</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-main mb-3">General Import Flags</h4>
                    {[
                      { key: "create_missing_categories", label: "Auto-create missing categories", desc: "If a category from the file doesn't exist, create it automatically" },
                      { key: "create_missing_brands", label: "Auto-create missing brands", desc: "If a brand from the file doesn't exist, create it automatically" },
                      { key: "skip_duplicates", label: "Skip duplicate products", desc: "Skip rows where SKU or name already exists in the system" },
                      { key: "update_existing_products", label: "Update existing products", desc: "If a product already exists, update its price, category, and stock" },
                      { key: "merge_stock", label: "Merge stock (additive)", desc: "Add imported stock to existing stock instead of replacing it" },
                      { key: "dry_run", label: "Dry Run (preview only)", desc: "Simulate the import without saving any data — see what would happen" },
                    ].map(opt => (
                      <label key={opt.key} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        options[opt.key] ? 'border-brand-neonblue/30 bg-brand-neonblue/5' : 'border-border/50 bg-brand-bgbase hover:border-brand-neonblue/20'
                      }`}>
                        <input
                          type="checkbox"
                          checked={options[opt.key]}
                          onChange={(e) => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                          className="mt-0.5 accent-brand-neonblue w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-bold text-main">{opt.label}</p>
                          <p className="text-[10px] text-muted mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 mt-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-main mb-3">Import Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-brand-bgbase rounded-xl p-3">
                    <p className="text-[10px] text-muted font-bold">Total Rows</p>
                    <p className="text-lg font-rajdhani font-black text-main">{rawData.length}</p>
                  </div>
                  <div className="bg-brand-bgbase rounded-xl p-3">
                    <p className="text-[10px] text-muted font-bold">Mapped Fields</p>
                    <p className="text-lg font-rajdhani font-black text-brand-neonblue">{mappedCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted hover:text-main border border-border/50 flex items-center gap-2">
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-brand-neonblue text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importing ? "Importing..." : (options.dry_run ? "Run Dry Test" : "Import Now")}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <div className="bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className={`px-6 py-6 flex items-center gap-4 ${importResult.dryRunCommitted ? 'bg-green-500/10 border-b border-green-500/20' : 'bg-amber-500/10 border-b border-amber-500/20'}`}>
                  {importResult.dryRunCommitted ? (
                    <CheckCircle2 size={24} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={24} className="text-amber-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-black text-main uppercase tracking-widest">{importResult.message}</h3>
                    <p className="text-[10px] text-muted mt-1">
                      {importResult.dryRunCommitted ? "All data has been saved to the database." : "No data was saved — this was a dry run preview."}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Imported", value: importResult.imported, color: "text-green-500" },
                      { label: "Updated", value: importResult.updated, color: "text-brand-neonblue" },
                      { label: "Skipped", value: importResult.skipped, color: "text-amber-500" },
                      { label: "New Categories", value: importResult.createdCategories, color: "text-brand-neonpurple" },
                      { label: "New Brands", value: importResult.createdBrands, color: "text-pink-500" },
                      { label: "Warnings", value: importResult.warnings?.length || 0, color: "text-amber-500" },
                    ].map(s => (
                      <div key={s.label} className="bg-brand-bgbase rounded-xl p-3">
                        <p className="text-[10px] text-muted font-bold">{s.label}</p>
                        <p className={`text-xl font-rajdhani font-black ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {importResult.warnings?.length > 0 && (
                    <div className="bg-brand-bgbase rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-1">
                        <AlertTriangle size={10} /> Warnings
                      </h4>
                      <div className="space-y-1">
                        {importResult.warnings.map((w, i) => (
                          <p key={i} className="text-[10px] text-muted">
                            <span className="font-bold text-main">Row {w.row}:</span> {w.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-brand-bgbase/50">
                  <button onClick={resetAll} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted hover:text-main border border-border/50 flex items-center gap-2">
                    <RotateCcw size={14} /> New Import
                  </button>
                  {importResult.dryRunCommitted && importResult.createdIds?.length > 0 && (
                    <button
                      onClick={handleUndo}
                      className="bg-brand-crimson/15 text-brand-crimson px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-crimson/25 flex items-center gap-2 transition-all border border-brand-crimson/20"
                    >
                      <Undo2 size={14} /> Undo Import ({importResult.createdIds.length})
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
