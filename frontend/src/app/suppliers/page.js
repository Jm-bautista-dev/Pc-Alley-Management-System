"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError } from "@/context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Mail,
  Phone,
  Plus,
  X,
  RefreshCw,
  Loader2,
  MapPin,
  Building,
  User,
  Briefcase
} from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [supplierName, setSupplierName] = useState(""); // Maps to contact_person
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Validation state
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/suppliers"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || `Server error ${res.status}`;
        setError(msg);
        showError(msg);
      }
    } catch (e) {
      const msg = "Network error — could not reach server";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenModal = () => {
    setCompanyName("");
    setSupplierName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const validateForm = () => {
    const errors = {};

    // 1. Company Name validation (Required, 2-100 characters)
    if (!companyName.trim()) {
      errors.companyName = "Company Name is required.";
    } else if (companyName.trim().length < 2 || companyName.trim().length > 100) {
      errors.companyName = "Company Name must be between 2 and 100 characters.";
    }

    // 2. Supplier Name validation (Required, letters, spaces, dots, 2-100 chars)
    if (!supplierName.trim()) {
      errors.supplierName = "Supplier Name is required.";
    } else if (supplierName.trim().length < 2 || supplierName.trim().length > 100) {
      errors.supplierName = "Supplier Name must be between 2 and 100 characters.";
    } else if (!/^[A-Za-z\s.]+$/.test(supplierName.trim())) {
      errors.supplierName = "Supplier Name can only contain letters, spaces, and dots.";
    }

    // 3. Email validation (Required, valid format, max 100 chars)
    if (!email.trim()) {
      errors.email = "Email Address is required.";
    } else if (email.trim().length > 100) {
      errors.email = "Email must be at most 100 characters.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@domain.com).";
    }

    // 4. Phone validation (Required, exactly 11 digits, must start with 09)
    if (!phone.trim()) {
      errors.phone = "Phone Number is required.";
    } else if (phone.trim().length !== 11) {
      errors.phone = "Phone number must be exactly 11 digits.";
    } else if (!/^09\d{9}$/.test(phone.trim())) {
      errors.phone = "Phone number must start with 09.";
    }

    // 5. Address validation (Required, max 255 chars)
    if (!address.trim()) {
      errors.address = "Office Address is required.";
    } else if (address.trim().length > 255) {
      errors.address = "Address must be at most 255 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation check
    if (!validateForm()) {
      showError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/suppliers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: companyName.trim(),
          contact_person: supplierName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim()
        })
      });

      if (res.ok) {
        showSuccess("Supplier added successfully!");
        setIsModalOpen(false);
        fetchSuppliers(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.errors) {
          // Parse express-validator formatted array
          const serverErrors = {};
          errData.errors.forEach(err => {
            const key = Object.keys(err)[0];
            const msg = Object.values(err)[0];
            
            // Map server keys to formErrors state keys
            if (key === 'name') serverErrors.companyName = msg;
            else if (key === 'contact_person') serverErrors.supplierName = msg;
            else if (key === 'phone') serverErrors.phone = msg;
            else if (key === 'email') serverErrors.email = msg;
            else if (key === 'address') serverErrors.address = msg;
          });
          setFormErrors(serverErrors);
          showError("Validation failed. Please correct highlighted fields.");
        } else {
          showError(errData.error || "Failed to create supplier.");
        }
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter
  const filtered = suppliers.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-500">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SUPPLIER MANAGEMENT NETWORK" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar bg-brand-bgbase text-main">
          <div className="max-w-[1600px] mx-auto w-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <p className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
                  Contact Management
                </p>
                <h1 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Supplier <span className="text-brand-neonblue">Directory</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => fetchSuppliers(true)}
                  disabled={refreshing}
                  className="h-12 px-5 flex items-center gap-2 bg-brand-surface border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Sync
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleOpenModal}
                  className="h-12 px-6 flex items-center gap-2 bg-brand-neonblue text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-brand-neonblue/20"
                >
                  <Plus size={14} />
                  Add Supplier
                </motion.button>
              </div>
            </div>

            {/* KPI Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 md:p-6 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-bgbase border border-border flex items-center justify-center text-brand-neonblue">
                  <Building size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted">Total Partners</p>
                  <p className="text-lg font-rajdhani font-black text-main">{suppliers.length}</p>
                </div>
              </motion.div>
            </div>

            {/* Table Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6 md:p-10 shadow-sm"
            >
              {/* Search Control */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="relative group w-full md:max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-neonblue transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by company, contact person, email or phone…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-brand-surface border border-border rounded-xl py-3.5 pl-11 pr-5 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold placeholder:opacity-30 shadow-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[3px] text-muted/30 border-b border-border/10">
                      <th className="pb-6 pr-4">ID</th>
                      <th className="pb-6 px-4">Company Name</th>
                      <th className="pb-6 px-4">Supplier Name</th>
                      <th className="pb-6 px-4">Contact Info</th>
                      <th className="pb-6 pl-4">Address</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-24">
                          <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(r => (
                              <div key={r} className="flex items-center gap-4 px-2">
                                <div className="w-10 h-10 rounded-xl bg-brand-surface animate-pulse flex-shrink-0" />
                                <div className="flex-1 h-4 rounded bg-brand-surface animate-pulse" />
                                <div className="w-40 h-4 rounded bg-brand-surface animate-pulse" />
                                <div className="w-32 h-4 rounded bg-brand-surface animate-pulse" />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full border border-brand-crimson/20 bg-brand-crimson/10 flex items-center justify-center">
                              <X size={20} className="text-brand-crimson" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-crimson">Failed to load suppliers</p>
                            <p className="text-[10px] text-muted/40 font-mono">{error}</p>
                            <button
                              onClick={() => fetchSuppliers(false)}
                              className="mt-2 h-9 px-5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Briefcase size={36} className="text-main/10" />
                            <p className="text-[10px] font-black uppercase tracking-[4px] text-muted/30">
                              {suppliers.length === 0 ? "No suppliers yet — add your first supplier" : "No suppliers match your query"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((supplier, i) => (
                        <motion.tr
                          key={supplier.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-main/5 hover:bg-brand-surface/30 transition-all group"
                        >
                          <td className="py-6 pr-4 font-mono text-[10px] text-muted/40 group-hover:text-brand-neonblue transition-colors uppercase tracking-[2px]">
                            SU-{supplier.id?.toString?.().padStart(3, "0") || "---"}
                          </td>
                          <td className="py-6 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-surface border border-border flex items-center justify-center font-black text-[11px] text-muted group-hover:border-brand-neonblue/20 group-hover:text-brand-neonblue transition-all">
                                {supplier.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-black text-main group-hover:text-brand-neonblue transition-colors">{supplier.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-4 font-semibold text-[13px] text-main/80">
                            {supplier.contact_person || "—"}
                          </td>
                          <td className="py-6 px-4">
                            <div className="space-y-1.5">
                              {supplier.email && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-muted/60">
                                  <Mail size={11} className="opacity-40" /> {supplier.email}
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-muted/60">
                                  <Phone size={11} className="opacity-40" /> {supplier.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-6 pl-4 text-[11px] font-semibold text-muted/50 max-w-[200px] truncate">
                            {supplier.address ? (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={11} className="opacity-30" /> {supplier.address}
                              </span>
                            ) : "—"}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-[10px] font-black text-muted/30 uppercase tracking-widest">
                Showing {filtered.length} of {suppliers.length} suppliers
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-brand-bgbase/75 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-lg bg-brand-surface border border-border rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted">Register Partner</p>
                  <h3 className="text-lg font-rajdhani font-black uppercase text-main">Add New Supplier</h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-brand-bgbase rounded-xl text-muted hover:text-main transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Company Name *</label>
                    <div className="relative">
                      <Building size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g. Intel Corp"
                        value={companyName}
                        onChange={e => {
                          setCompanyName(e.target.value);
                          if (formErrors.companyName) {
                            setFormErrors(prev => ({ ...prev, companyName: null }));
                          }
                        }}
                        className={`w-full bg-brand-bgbase border rounded-xl pl-11 pr-4 py-3 text-xs text-main font-bold outline-none transition-colors ${
                          formErrors.companyName ? "border-brand-crimson/50 focus:border-brand-crimson" : "border-border/50 focus:border-brand-neonblue"
                        }`}
                      />
                    </div>
                    {formErrors.companyName && (
                      <p className="text-[10px] font-bold text-brand-crimson mt-1.5">{formErrors.companyName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Supplier Name *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g. John Doe"
                        value={supplierName}
                        onChange={e => {
                          const val = e.target.value.replace(/[^A-Za-z\s.]/g, "");
                          setSupplierName(val);
                          if (formErrors.supplierName) {
                            setFormErrors(prev => ({ ...prev, supplierName: null }));
                          }
                        }}
                        className={`w-full bg-brand-bgbase border rounded-xl pl-11 pr-4 py-3 text-xs text-main font-bold outline-none transition-colors ${
                          formErrors.supplierName ? "border-brand-crimson/50 focus:border-brand-crimson" : "border-border/50 focus:border-brand-neonblue"
                        }`}
                      />
                    </div>
                    {formErrors.supplierName && (
                      <p className="text-[10px] font-bold text-brand-crimson mt-1.5">{formErrors.supplierName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g. sales@intel.com"
                        value={email}
                        onChange={e => {
                          const val = e.target.value.replace(/\s/g, "");
                          setEmail(val);
                          if (formErrors.email) {
                            setFormErrors(prev => ({ ...prev, email: null }));
                          }
                        }}
                        className={`w-full bg-brand-bgbase border rounded-xl pl-11 pr-4 py-3 text-xs text-main font-bold outline-none transition-colors ${
                          formErrors.email ? "border-brand-crimson/50 focus:border-brand-crimson" : "border-border/50 focus:border-brand-neonblue"
                        }`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-[10px] font-bold text-brand-crimson mt-1.5">{formErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Phone Number *</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        required
                        maxLength={11}
                        placeholder="e.g. 09123456789"
                        value={phone}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 11) {
                            val = val.slice(0, 11);
                          }
                          if (val.length > 0) {
                            if (!val.startsWith("0")) {
                              val = "09" + val;
                            } else if (val.length > 1 && !val.startsWith("09")) {
                              val = "09" + val.slice(1);
                            }
                          }
                          val = val.slice(0, 11);
                          setPhone(val);
                          if (formErrors.phone) {
                            setFormErrors(prev => ({ ...prev, phone: null }));
                          }
                        }}
                        className={`w-full bg-brand-bgbase border rounded-xl pl-11 pr-4 py-3 text-xs text-main font-bold outline-none transition-colors ${
                          formErrors.phone ? "border-brand-crimson/50 focus:border-brand-crimson" : "border-border/50 focus:border-brand-neonblue"
                        }`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-[10px] font-bold text-brand-crimson mt-1.5">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Office Address *</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-4 top-3 text-muted" />
                    <textarea
                      placeholder="e.g. Manila, Philippines"
                      required
                      value={address}
                      maxLength={255}
                      onChange={e => {
                        setAddress(e.target.value);
                        if (formErrors.address) {
                          setFormErrors(prev => ({ ...prev, address: null }));
                        }
                      }}
                      rows={3}
                      className={`w-full bg-brand-bgbase border rounded-xl pl-11 pr-4 py-3 text-xs text-main font-bold outline-none transition-colors resize-none ${
                        formErrors.address ? "border-brand-crimson/50 focus:border-brand-crimson" : "border-border/50 focus:border-brand-neonblue"
                      }`}
                    />
                  </div>
                  {formErrors.address && (
                    <p className="text-[10px] font-bold text-brand-crimson mt-1.5">{formErrors.address}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-11 px-5 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted hover:text-main hover:bg-brand-bgbase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-6 rounded-xl bg-brand-neonblue text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-brand-neonblue/20 disabled:opacity-75"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {submitting ? "Adding..." : "Add Supplier"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
