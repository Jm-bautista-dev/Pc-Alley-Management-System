"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Users,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Key,
  Layers,
  ShoppingBag,
  Package,
  Wrench,
  DollarSign,
  ClipboardList,
  Search
} from "lucide-react";
import Link from "next/link";

const ROLES_INFO = [
  {
    id: "super_admin",
    name: "Super Admin",
    badge: "Executive Control",
    color: "#A78BD2",
    description: "Full global system authority across all branches. Manages all products, global stock requisitions, high-level approvals, financial reports, and branch staff provision.",
    userCount: "HQ Management",
    level: "Tier 1 — Full Access"
  },
  {
    id: "branch_admin",
    name: "Branch Manager",
    badge: "Branch Administrator",
    color: "#7B8CDE",
    description: "Branch-level administrative operations. Approves branch restock requests, creates branch staff accounts, manages branch sales, customer registry, and local inventory stock.",
    userCount: "Store Level",
    level: "Tier 2 — Branch Scoped"
  },
  {
    id: "employee",
    name: "Staff Associate",
    badge: "Operational Staff",
    color: "#F9A8C9",
    description: "Daily frontline retail and service operations. Processes POS sales terminal transactions, creates draft quotes, logs work order jobs, and submits restock replenishment requests.",
    userCount: "Frontline",
    level: "Tier 3 — Operational"
  }
];

const PERMISSIONS_MATRIX = [
  {
    module: "Sales Terminal & POS",
    icon: ShoppingBag,
    permissions: [
      { action: "Process Cash/Card/Online Sales", super_admin: true, branch_admin: true, employee: true },
      { action: "Apply Custom Discounts & Vouchers", super_admin: true, branch_admin: true, employee: false },
      { action: "Issue Warranty Certificates", super_admin: true, branch_admin: true, employee: true },
      { action: "Process Sales Returns & Refunds", super_admin: true, branch_admin: true, employee: false },
      { action: "View All-Branch Sales Transactions", super_admin: true, branch_admin: false, employee: false }
    ]
  },
  {
    module: "Products & Inventory",
    icon: Package,
    permissions: [
      { action: "View Product Catalog & Barcodes", super_admin: true, branch_admin: true, employee: true },
      { action: "Create / Edit / Archive Products", super_admin: true, branch_admin: false, employee: false },
      { action: "Bulk Import Excel Inventory", super_admin: true, branch_admin: false, employee: false },
      { action: "Manage Brands & Categories", super_admin: true, branch_admin: false, employee: false },
      { action: "View Multi-Branch Stock Levels", super_admin: true, branch_admin: false, employee: false },
      { action: "Adjust Local Branch Stock", super_admin: true, branch_admin: true, employee: false }
    ]
  },
  {
    module: "Stock Requisitions & Restock",
    icon: ClipboardList,
    permissions: [
      { action: "Submit Stock Restock Request", super_admin: true, branch_admin: true, employee: true },
      { action: "Approve Local Branch Restock", super_admin: true, branch_admin: true, employee: false },
      { action: "Request HQ Product Requisition", super_admin: false, branch_admin: true, employee: false },
      { action: "Approve & Dispatch Requisitions", super_admin: true, branch_admin: false, employee: false }
    ]
  },
  {
    module: "Services & Work Orders",
    icon: Wrench,
    permissions: [
      { action: "View Service Catalog", super_admin: true, branch_admin: true, employee: true },
      { action: "Log New Work Order / Job Ticket", super_admin: true, branch_admin: true, employee: true },
      { action: "Update Job Diagnosis & Status", super_admin: true, branch_admin: true, employee: true },
      { action: "Configure Service Rates & Types", super_admin: true, branch_admin: true, employee: false }
    ]
  },
  {
    module: "Customer & Pricing Management",
    icon: Users,
    permissions: [
      { action: "Search & View Customer Registry", super_admin: true, branch_admin: true, employee: true },
      { action: "Add & Edit Customer Records", super_admin: true, branch_admin: true, employee: true },
      { action: "Export Customer-Specific Pricelists", super_admin: true, branch_admin: true, employee: false },
      { action: "Manage Customer Tiers & Groups", super_admin: true, branch_admin: true, employee: false }
    ]
  },
  {
    module: "User & Role Administration",
    icon: ShieldCheck,
    permissions: [
      { action: "Provision Staff Accounts", super_admin: true, branch_admin: true, employee: false },
      { action: "Provision Branch Managers", super_admin: true, branch_admin: false, employee: false },
      { action: "Reset User Passwords & Permissions", super_admin: true, branch_admin: true, employee: false },
      { action: "View Audit & Security Logs", super_admin: true, branch_admin: false, employee: false }
    ]
  },
  {
    module: "Financial Reports & Analytics",
    icon: DollarSign,
    permissions: [
      { action: "View Daily Sales Ledger", super_admin: true, branch_admin: true, employee: true },
      { action: "View Branch Profit & Loss Statements", super_admin: true, branch_admin: true, employee: false },
      { action: "View Global Consolidated P&L", super_admin: true, branch_admin: false, employee: false },
      { action: "Access Sales Forecasting AI", super_admin: true, branch_admin: false, employee: false }
    ]
  }
];

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [selectedRole, setSelectedRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatrix = PERMISSIONS_MATRIX.map(section => ({
    ...section,
    permissions: section.permissions.filter(p =>
      p.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.module.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.permissions.length > 0);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="ROLE & PERMISSION MANAGEMENT" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="max-w-[1600px] mx-auto w-full">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <p className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
                  Access Control
                </p>
                <h1 className="text-2xl font-rajdhani font-black uppercase text-main">
                  Roles &amp; <span className="text-brand-neonblue">Permissions</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/staff"
                  className="h-11 px-5 rounded-xl border border-border bg-brand-surface hover:bg-brand-bgbase text-xs font-black uppercase tracking-wider text-muted hover:text-main flex items-center gap-2 transition-all"
                >
                  <Users size={14} /> Staff Registry
                </Link>
              </div>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {ROLES_INFO.map((role, i) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card p-6 flex flex-col justify-between border border-border/80 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: role.color }} />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                        style={{ backgroundColor: role.color + "20", color: role.color }}
                      >
                        {role.badge}
                      </span>
                      <span className="text-[10px] font-bold text-muted/60">{role.level}</span>
                    </div>
                    <h3 className="text-xl font-rajdhani font-black uppercase text-main mb-2">
                      {role.name}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mb-4 font-medium">
                      {role.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border/20 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-black uppercase text-muted/50 tracking-wider">Scope</span>
                    <span className="font-bold text-main">{role.userCount}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Permissions Matrix */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6 md:p-8 shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-rajdhani font-black uppercase tracking-wide text-main">
                    System Permission Matrix
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Granular access rights assigned to each system role.
                  </p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-brand-surface border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/40"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[2px] text-muted/50 border-b border-border/30 bg-brand-bgbase/40">
                      <th className="py-3.5 px-4 w-1/2">Module &amp; Action Capability</th>
                      <th className="py-3.5 px-4 text-center text-[#A78BD2]">Super Admin</th>
                      <th className="py-3.5 px-4 text-center text-[#7B8CDE]">Branch Manager</th>
                      <th className="py-3.5 px-4 text-center text-[#F9A8C9]">Staff Associate</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-border/10">
                    {filteredMatrix.map((section, sIdx) => (
                      <div key={sIdx} className="contents">
                        <tr className="bg-brand-surface/60 font-rajdhani font-black text-xs uppercase tracking-widest text-brand-neonblue">
                          <td colSpan={4} className="py-3 px-4 flex items-center gap-2">
                            <section.icon size={14} />
                            {section.module}
                          </td>
                        </tr>
                        {section.permissions.map((perm, pIdx) => (
                          <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-main">
                              {perm.action}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {perm.super_admin ? (
                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              ) : (
                                <XCircle size={16} className="text-muted/30 mx-auto" />
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {perm.branch_admin ? (
                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              ) : (
                                <XCircle size={16} className="text-muted/30 mx-auto" />
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {perm.employee ? (
                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              ) : (
                                <XCircle size={16} className="text-muted/30 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </div>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
