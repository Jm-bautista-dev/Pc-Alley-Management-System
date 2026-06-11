"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  PlusCircle,
  Search,
  Receipt,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

const CATEGORIES = ["Rent", "Utilities", "Salaries", "Maintenance", "Marketing", "Supplies", "Transport", "Other"];

export default function ExpensesPage() {
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pc_alley_expenses") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Rent",
    date: new Date().toISOString().split("T")[0],
    note: ""
  });

  const saveExpenses = (updated) => {
    setExpenses(updated);
    localStorage.setItem("pc_alley_expenses", JSON.stringify(updated));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return showError("Fill in all required fields");
    const newEntry = {
      id: Date.now(),
      ...form,
      amount: parseFloat(form.amount),
      createdAt: new Date().toISOString()
    };
    saveExpenses([newEntry, ...expenses]);
    showSuccess("Expense logged successfully");
    setIsModalOpen(false);
    setForm({ description: "", amount: "", category: "Rent", date: new Date().toISOString().split("T")[0], note: "" });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this expense entry?")) return;
    saveExpenses(expenses.filter(e => e.id !== id));
    showSuccess("Entry removed");
  };

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonth = expenses.filter(e => new Date(e.createdAt).getMonth() === new Date().getMonth());
  const monthlyTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = CATEGORIES.map(cat => ({
    name: cat,
    total: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const CATEGORY_COLORS = {
    Rent: "#DC828F", Utilities: "#7B8CDE", Salaries: "#10B981",
    Maintenance: "#F59E0B", Marketing: "#8B5CF6", Supplies: "#00F2FF",
    Transport: "#F97316", Other: "#94A3B8"
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="EXPENSE REGISTRY" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Operational Costs
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              EXPENSE <span className="text-brand-crimson">REGISTRY</span>
            </h1>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-brand-surface border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Total Expenses</p>
              <p className="text-2xl font-rajdhani font-black text-brand-crimson">₱{totalSpent.toLocaleString()}</p>
              <p className="text-[10px] text-muted font-bold mt-1">{expenses.length} entries logged</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-brand-surface border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">This Month</p>
              <p className="text-2xl font-rajdhani font-black text-yellow-500">₱{monthlyTotal.toLocaleString()}</p>
              <p className="text-[10px] text-muted font-bold mt-1">{thisMonth.length} this month</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Top Category</p>
              <p className="text-2xl font-rajdhani font-black text-brand-neonblue">
                {categoryTotals[0]?.name || "—"}
              </p>
              <p className="text-[10px] text-muted font-bold mt-1">
                {categoryTotals[0] ? `₱${categoryTotals[0].total.toLocaleString()}` : "No data yet"}
              </p>
            </motion.div>
          </div>

          {/* Category Breakdown */}
          {categoryTotals.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-brand-surface border border-border rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={16} className="text-brand-neonblue" />
                <h3 className="text-[10px] font-black uppercase tracking-[3px] text-main">Breakdown by Category</h3>
              </div>
              <div className="space-y-3">
                {categoryTotals.map((cat) => {
                  const pct = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
                  const color = CATEGORY_COLORS[cat.name] || "#94A3B8";
                  return (
                    <div key={cat.name} className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted w-24 shrink-0">{cat.name}</span>
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full rounded-full" style={{ backgroundColor: color }} />
                      </div>
                      <span className="text-[11px] font-rajdhani font-black shrink-0" style={{ color }}>₱{cat.total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text" value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search expense or category..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="5" className="py-20 text-center">
                      <Receipt className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search ? "No matching expenses" : 'No expenses logged yet — click "Log New Expense" to start'}
                      </p>
                    </td></tr>
                  ) : paginated.map((exp, idx) => (
                    <motion.tr key={exp.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-main">{exp.description}</p>
                        {exp.note && <p className="text-[10px] text-muted font-bold mt-0.5 truncate max-w-[200px]">{exp.note}</p>}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border"
                          style={{ color: CATEGORY_COLORS[exp.category], borderColor: CATEGORY_COLORS[exp.category] + "30", backgroundColor: CATEGORY_COLORS[exp.category] + "15" }}>
                          <Tag size={9} /> {exp.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-muted font-bold">
                        {new Date(exp.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-4 px-6 text-right font-rajdhani font-black text-brand-crimson text-lg">
                        ₱{exp.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => handleDelete(exp.id)}
                          className="p-2 rounded-lg bg-brand-bgbase border border-border text-muted hover:text-brand-crimson hover:border-brand-crimson/30 transition-all opacity-60 group-hover:opacity-100">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="border-t border-border/50 p-4 flex items-center justify-between bg-brand-bgbase/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronLeft size={14} /></button>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>


    </div>
  );
}