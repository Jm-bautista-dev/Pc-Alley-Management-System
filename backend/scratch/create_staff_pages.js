const fs = require('fs');
const path = require('path');
const base = 'c:\\xampp\\htdocs\\capstone\\frontend\\src\\app';

const pages = [
  { dir: 'expenses', title: 'Expenses', icon: 'DollarSign', content: 'Track and manage all business expenses.' },
  { dir: 'expenses/add', title: 'Add Expense', icon: 'PlusCircle', content: 'Record a new expense entry.' },
  { dir: 'expenses/categories', title: 'Expense Categories', icon: 'Tag', content: 'Manage expense categories.' },
  { dir: 'hrm', title: 'HRM', icon: 'Users2', content: 'Human Resource Management module.' },
  { dir: 'essentials', title: 'Essentials', icon: 'Star', content: 'Essential tools and configurations.' },
];

pages.forEach(p => {
  const dirPath = path.join(base, p.dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  const fnName = p.dir.replace(/\//g, '-').replace(/-./g, m => m[1].toUpperCase()).replace(/^./, m => m.toUpperCase()) + 'Page';
  const lines = [
    '"use client";',
    `import { ${p.icon} } from "lucide-react";`,
    `export default function ${fnName}() {`,
    '  return (',
    '    <div className="p-8">',
    '      <div className="flex items-center gap-3 mb-8">',
    `        <${p.icon} className="text-brand-crimson" size={24} />`,
    `        <h1 className="text-2xl font-black text-main">${p.title}</h1>`,
    '      </div>',
    '      <div className="bg-brand-surface border border-border p-8 rounded-xl">',
    `        <p className="text-muted">${p.content}</p>`,
    '      </div>',
    '    </div>',
    '  );',
    '}',
  ];
  fs.writeFileSync(path.join(dirPath, 'page.js'), lines.join('\n'));
  console.log('Created: ' + p.dir);
});
console.log('Done!');
