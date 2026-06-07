const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'all', title: 'ALL SALES', icon: 'ShoppingCart', desc: 'List of all system sales.' },
  { path: 'add', title: 'ADD SALE', icon: 'PlusCircle', desc: 'Create a new sale record.' },
  { path: 'pos/list', title: 'LIST POS', icon: 'List', desc: 'List all Point of Sale transactions.' },
  { path: 'pos', title: 'POS TERMINAL', icon: 'Monitor', desc: 'Point of Sale Terminal Interface.' },
  { path: 'drafts/add', title: 'ADD DRAFT', icon: 'FileEdit', desc: 'Create a new draft sale.' },
  { path: 'drafts', title: 'LIST DRAFTS', icon: 'Files', desc: 'View saved draft sales.' },
  { path: 'quotations/add', title: 'ADD QUOTATION', icon: 'FilePlus', desc: 'Create a new quotation for a customer.' },
  { path: 'quotations', title: 'LIST QUOTATIONS', icon: 'FileText', desc: 'View all customer quotations.' },
  { path: 'returns', title: 'LIST SELL RETURN', icon: 'CornerDownLeft', desc: 'View all returned sales.' },
  { path: 'shipments', title: 'SHIPMENTS', icon: 'Truck', desc: 'Manage sale shipments and deliveries.' },
  { path: 'discounts', title: 'DISCOUNTS', icon: 'Tag', desc: 'Manage promotional discounts.' },
  { path: 'import', title: 'IMPORT SALES', icon: 'UploadCloud', desc: 'Import bulk sales data via CSV.' }
];

const basePath = 'c:\\xampp\\htdocs\\capstone\\frontend\\src\\app\\sell';

pages.forEach(p => {
  const fullPath = path.join(basePath, p.path);
  fs.mkdirSync(fullPath, { recursive: true });
  
  // Calculate relative path to components.
  // if path is 'all' (1 level), we need '../../components'
  // if path is 'pos/list' (2 levels), we need '../../../components'
  const levels = p.path.split('/').length;
  // page.js is inside fullPath. So it is app/sell/path/page.js => root is ../../.. + '../' for each level
  // Actually from app/sell/all/page.js to app/components:
  // app/sell/all is 3 levels deep from app. Wait, components is at src/components.
  // app is inside src. So src/app/sell/all. 
  // from src/app/sell/all/page.js to src/components -> ../../../components
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

console.log('Pages created successfully.');
