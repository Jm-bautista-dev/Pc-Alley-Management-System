const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'profit-loss', title: 'PROFIT & LOSS', icon: 'TrendingUp', desc: 'Financial breakdown of income vs expenses.' },
  { path: 'purchase-sale', title: 'PURCHASE & SALE', icon: 'Repeat', desc: 'Comparison between purchased and sold items.' },
  { path: 'tax', title: 'TAX REPORT', icon: 'FileText', desc: 'Tax calculation details and history.' },
  { path: 'stock', title: 'STOCK REPORT', icon: 'PackageCheck', desc: 'Current inventory stock levels.' },
  { path: 'trending', title: 'TRENDING PRODUCTS', icon: 'Zap', desc: 'High performing product analytics.' },
];

const basePath = 'c:\\xampp\\htdocs\\capstone\\frontend\\src\\app\\reports';

pages.forEach(p => {
  const fullPath = path.join(basePath, p.path);
  fs.mkdirSync(fullPath, { recursive: true });
  
  const levels = p.path.split('/').length;
  const relativePrefix = '../'.repeat(levels + 2); 

  const content = `"use client";

import Sidebar from "${relativePrefix}components/Sidebar";
import TopBar from "${relativePrefix}components/TopBar";
import { ${p.icon} } from "lucide-react";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="${p.title}" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 uppercase">
              <${p.icon} size={24} className="text-brand-neonblue" /> 
              ${p.title}
            </h2>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-10 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <${p.icon} size={48} className="text-muted mb-4 opacity-50" />
            <p className="text-muted font-bold text-sm text-center">Preview Mode: ${p.title}</p>
            <p className="text-muted/60 text-xs mt-2 uppercase tracking-widest text-center">${p.desc}</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(fullPath, 'page.js'), content);
});

console.log('Report pages created successfully.');
