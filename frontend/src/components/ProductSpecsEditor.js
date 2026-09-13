"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Sliders, FileCode, Check, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategorySpecTemplate, parseProductSpecs } from "@/lib/hardwareSpecs";

export default function ProductSpecsEditor({
  category = null,
  value = "",
  onChange = () => {},
  className = ""
}) {
  const [mode, setMode] = useState("structured"); // 'structured' | 'raw'
  const [structuredData, setStructuredData] = useState({});
  const [customFields, setCustomFields] = useState([]); // [ { key: '', value: '' } ]
  const [rawText, setRawText] = useState("");

  // Determine current template based on category
  const template = useMemo(() => {
    return getCategorySpecTemplate(category);
  }, [category]);

  // Sync initial / external value
  useEffect(() => {
    if (!value) {
      setStructuredData({});
      setCustomFields([]);
      setRawText("");
      return;
    }

    const parsed = parseProductSpecs(value);
    if (typeof parsed === "object" && parsed !== null) {
      const knownTemplateKeys = new Set(template ? template.fields.map(f => f.key) : []);
      const templateVals = {};
      const customVals = [];

      for (const [k, v] of Object.entries(parsed)) {
        if (knownTemplateKeys.has(k)) {
          templateVals[k] = v;
        } else {
          customVals.push({ key: k, value: v });
        }
      }

      setStructuredData(templateVals);
      setCustomFields(customVals);
      setRawText(JSON.stringify(parsed, null, 2));
    } else if (typeof parsed === "string") {
      setRawText(parsed);
      setMode("raw");
    }
  }, [value, template]);

  // Emit changes to parent
  const emitChanges = (updatedTemplateData, updatedCustomFields) => {
    const combined = { ...updatedTemplateData };
    for (const item of updatedCustomFields) {
      const k = (item.key || "").trim();
      const v = (item.value || "").trim();
      if (k && v) {
        combined[k] = v;
      }
    }

    // Clean empty values
    const finalObj = {};
    for (const [k, v] of Object.entries(combined)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        finalObj[k.trim()] = String(v).trim();
      }
    }

    const hasKeys = Object.keys(finalObj).length > 0;
    const jsonString = hasKeys ? JSON.stringify(finalObj) : "";
    onChange(jsonString);
    setRawText(hasKeys ? JSON.stringify(finalObj, null, 2) : "");
  };

  const handleTemplateFieldChange = (key, val) => {
    const next = { ...structuredData, [key]: val };
    setStructuredData(next);
    emitChanges(next, customFields);
  };

  const handleCustomFieldChange = (index, field, val) => {
    const next = customFields.map((item, idx) => {
      if (idx === index) return { ...item, [field]: val };
      return item;
    });
    setCustomFields(next);
    emitChanges(structuredData, next);
  };

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: "", value: "" }]);
  };

  const removeCustomField = (index) => {
    const next = customFields.filter((_, idx) => idx !== index);
    setCustomFields(next);
    emitChanges(structuredData, next);
  };

  const handleRawTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    onChange(text);

    // Try parsing to update structured view
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        const knownTemplateKeys = new Set(template ? template.fields.map(f => f.key) : []);
        const templateVals = {};
        const customVals = [];
        for (const [k, v] of Object.entries(parsed)) {
          if (knownTemplateKeys.has(k)) {
            templateVals[k] = v;
          } else {
            customVals.push({ key: k, value: v });
          }
        }
        setStructuredData(templateVals);
        setCustomFields(customVals);
      }
    } catch {
      // plain text mode
    }
  };

  const prefillSample = () => {
    if (!template) return;
    const sample = {};
    for (const f of template.fields) {
      if (f.placeholder && f.placeholder.startsWith("e.g. ")) {
        const parts = f.placeholder.replace("e.g. ", "").split(",");
        sample[f.key] = parts[0].trim();
      }
    }
    setStructuredData(sample);
    emitChanges(sample, customFields);
  };

  const clearAll = () => {
    setStructuredData({});
    setCustomFields([]);
    setRawText("");
    onChange("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-brand-neonblue" />
          <span className="text-[10px] font-black uppercase tracking-[2px] text-muted">
            {template ? `${template.label} Specifications` : "Technical Specifications"}
          </span>
          {template && (
            <span className="text-[9px] bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20 px-2 py-0.5 rounded-full font-bold uppercase">
              Auto-Detected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {template && (
            <button
              type="button"
              onClick={prefillSample}
              className="text-[9px] font-bold text-muted hover:text-brand-neonblue transition-colors flex items-center gap-1 uppercase tracking-wider px-2 py-1 rounded hover:bg-brand-bgbase"
              title="Pre-fill with example values for this category"
            >
              <Sparkles size={11} /> Sample
            </button>
          )}

          <div className="flex items-center bg-brand-bgbase rounded-lg p-0.5 border border-border/40 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setMode("structured")}
              className={`px-2 py-1 rounded transition-colors uppercase tracking-wider ${
                mode === "structured" ? "bg-brand-surface text-brand-neonblue shadow-sm" : "text-muted hover:text-main"
              }`}
            >
              Fields
            </button>
            <button
              type="button"
              onClick={() => setMode("raw")}
              className={`px-2 py-1 rounded transition-colors uppercase tracking-wider flex items-center gap-1 ${
                mode === "raw" ? "bg-brand-surface text-brand-neonblue shadow-sm" : "text-muted hover:text-main"
              }`}
            >
              <FileCode size={11} /> Raw
            </button>
          </div>
        </div>
      </div>

      {mode === "structured" ? (
        <div className="space-y-4">
          {/* Template Recommended Fields */}
          {template && template.fields && template.fields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {template.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold text-main/80 uppercase tracking-wider mb-1">
                    {field.label || field.key}
                  </label>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={structuredData[field.key] || ""}
                    onChange={e => handleTemplateFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-brand-neonblue transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-brand-bgbase/40 border border-border/30 text-xs text-muted text-center">
              Select a hardware category above to load recommended PC part specifications, or add custom attributes below.
            </div>
          )}

          {/* Custom Dynamic Key-Value Fields */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[1.5px] text-muted">
                Additional / Custom Attributes ({customFields.length})
              </span>
              <button
                type="button"
                onClick={addCustomField}
                className="text-xs font-bold text-brand-neonblue hover:text-blue-500 transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus size={13} /> Add Specification
              </button>
            </div>

            <AnimatePresence>
              {customFields.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Attribute (e.g. TDP)"
                    value={item.key}
                    onChange={e => handleCustomFieldChange(idx, "key", e.target.value)}
                    className="w-1/3 bg-brand-bgbase border border-border/50 rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-brand-neonblue"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 105W)"
                    value={item.value}
                    onChange={e => handleCustomFieldChange(idx, "value", e.target.value)}
                    className="flex-1 bg-brand-bgbase border border-border/50 rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-brand-neonblue"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="p-2 rounded-lg text-muted hover:text-brand-crimson hover:bg-brand-crimson/10 transition-colors"
                    title="Remove Attribute"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Raw Text / JSON Mode */
        <div>
          <textarea
            value={rawText}
            onChange={handleRawTextChange}
            placeholder='Paste JSON or text specifications, e.g.:&#10;{&#10;  "Socket": "AM5",&#10;  "Cores": "16"&#10;}'
            rows={7}
            className="w-full bg-brand-bgbase border border-border/50 rounded-xl p-3 text-xs font-mono font-bold text-main outline-none focus:border-brand-neonblue transition-colors resize-none"
          />
          <p className="text-[10px] text-muted mt-1">
            Raw JSON or key-value text format is fully supported and searchable.
          </p>
        </div>
      )}
    </div>
  );
}
