const fs = require('fs');
const path = require('path');

function getFiles(dir, ext = '.js') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, ext));
    } else if (filePath.endsWith(ext)) {
      results.push(filePath);
    }
  });
  return results;
}

const appFiles = getFiles(path.join(__dirname, 'frontend', 'src', 'app'));
const componentFiles = getFiles(path.join(__dirname, 'frontend', 'src', 'components'));

console.log(`Auditing ${appFiles.length} App Router pages and ${componentFiles.length} components...`);

let issues = 0;
[...appFiles, ...componentFiles].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Check for unresolved merge conflicts
  if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
    console.error(`✗ MERGE CONFLICT DETECTED: ${file}`);
    issues++;
  }
  // Check for common broken import patterns
  const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
  importMatches.forEach(imp => {
    const target = imp.replace(/from\s+['"]/, '').replace(/['"]/, '');
    if (target.startsWith('@/')) {
      const relPath = target.replace('@/', '');
      const possiblePaths = [
        path.join(__dirname, 'frontend', 'src', relPath),
        path.join(__dirname, 'frontend', 'src', relPath + '.js'),
        path.join(__dirname, 'frontend', 'src', relPath + '.jsx'),
        path.join(__dirname, 'frontend', 'src', relPath, 'index.js'),
        path.join(__dirname, 'frontend', 'src', relPath, 'page.js')
      ];
      const exists = possiblePaths.some(p => fs.existsSync(p));
      if (!exists) {
        console.error(`✗ MISSING IMPORT in ${file}: "${target}"`);
        issues++;
      }
    }
  });
});

console.log(`Frontend Audit Complete. Issues found: ${issues}`);
