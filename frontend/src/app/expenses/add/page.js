"use client";
import { PlusCircle } from "lucide-react";
export default function ExpensesAddPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <PlusCircle className="text-brand-crimson" size={24} />
        <h1 className="text-2xl font-black text-main">Add Expense</h1>
      </div>
      <div className="bg-brand-surface border border-border p-8 rounded-xl">
        <p className="text-muted">Record a new expense entry.</p>
      </div>
    </div>
  );
}