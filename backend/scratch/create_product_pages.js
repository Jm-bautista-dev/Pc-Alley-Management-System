const fs = require('fs');
const path = require('path');

const basePath = `c:\\xampp\\htdocs\\capstone\\frontend\\src\\app\\products`;

const pages = [
  { dir: 'add', title: 'Add Product' },
  { dir: 'update-price', title: 'Update Price' },
  { dir: 'print-labels', title: 'Print Labels' },
  { dir: 'variations', title: 'Variations' },
  { dir: 'import', title: 'Import Products' },
  { dir: 'import-opening-stock', title: 'Import Opening Stock' },
  { dir: 'selling-price-group', title: 'Selling Price Group' },
  { dir: 'units', title: 'Units' },
  { dir: 'categories', title: 'Categories' },
  { dir: 'brands', title: 'Brands' },
  { dir: 'warranties', title: 'Warranties' }
];

pages.forEach(p => {
  const dirPath = path.join(basePath, p.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const content = `"use client";
import { Package } from "lucide-react";

export default function ${p.dir.replace(/-/g, ' ').replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase()).replace(/\s+/g, '')}Page() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Package className="text-brand-crimson" size={24} />
        <h1 className="text-2xl font-black text-main">${p.title}</h1>
      </div>
      <div className="bg-brand-surface border border-border p-8 rounded-xl">
        <p className="text-muted">The ${p.title} module has been initialized and is ready for data integration.</p>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(dirPath, 'page.js'), content);
});
console.log('Pages created successfully!');
