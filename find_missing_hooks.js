const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');
let issues = 0;
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const usesUseEffect = /\buseEffect\s*\(/.test(content);
  const usesUseState = /\buseState\s*\(/.test(content);
  const usesUseCallback = /\buseCallback\s*\(/.test(content);
  const usesUseMemo = /\buseMemo\s*\(/.test(content);
  const usesUseRef = /\buseRef\s*\(/.test(content);

  const reactImportMatch = content.match(/import\s+([^;]+)\s+from\s+['"]react['"]/);
  const imported = reactImportMatch ? reactImportMatch[1] : '';

  if (usesUseEffect && !imported.includes('useEffect')) {
    console.log(`[MISSING useEffect]: ${f}`);
    issues++;
  }
  if (usesUseState && !imported.includes('useState')) {
    console.log(`[MISSING useState]: ${f}`);
    issues++;
  }
  if (usesUseCallback && !imported.includes('useCallback')) {
    console.log(`[MISSING useCallback]: ${f}`);
    issues++;
  }
  if (usesUseMemo && !imported.includes('useMemo')) {
    console.log(`[MISSING useMemo]: ${f}`);
    issues++;
  }
  if (usesUseRef && !imported.includes('useRef')) {
    console.log(`[MISSING useRef]: ${f}`);
    issues++;
  }
});

console.log(`Scan complete. Found ${issues} issues.`);
