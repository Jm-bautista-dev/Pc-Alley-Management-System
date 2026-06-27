"use client";
import { Tag } from "lucide-react";
export default function ExpensesCategoriesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Tag className="text-brand-crimson" size={24} />
        <h1 className="text-2xl font-black text-main">Expense Categories</h1>
      </div>
      <div className="bg-brand-surface border border-border p-8 rounded-xl">
        <p className="text-muted">Manage expense categories.</p>
      </div>
    </div>
  );
}