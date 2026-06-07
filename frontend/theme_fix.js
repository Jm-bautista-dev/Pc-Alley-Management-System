const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function r(str, search, replacement) {
    return str.split(search).join(replacement);
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Direct background replacers
    content = r(content, 'bg-[#08090D]', 'bg-brand-bgbase');
    content = r(content, 'bg-[#0A0C11]', 'bg-brand-surface');

    // Regex Replacers
    
    // Borders
    content = content.replace(/border-white(\/\d+)?/g, 'border-border');
    
    // Text Opacity (muted)
    content = content.replace(/text-white\/[1-9][0-9]?/g, 'text-muted');
    
    // Solid Text
    content = content.replace(/text-white/g, 'text-main');

    // Background Opacity
    content = content.replace(/bg-white\/(\d+)/g, 'bg-main/$1');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated theme classes in: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log('Theme adaptation script completed.');
