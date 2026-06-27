const fs = require('fs');
const content = fs.readFileSync('frontend/src/app/dashboard/page.js', 'utf8');
const lines = content.split('\n');

let stack = [];
let results = [];

lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Find all <div or <main or <section etc
    const tags = line.match(/<[a-zA-Z0-9]+(?:\s+[^>]*?)?>|<\/[a-zA-Z0-9]+>/g);
    
    if (tags) {
        tags.forEach(tag => {
            if (tag.startsWith('</')) {
                const tagName = tag.match(/<\/([a-zA-Z0-9]+)>/)[1];
                if (stack.length > 0 && stack[stack.length - 1].name === tagName) {
                    stack.pop();
                } else {
                    results.push(`Unmatched closing tag ${tag} at line ${lineNum}`);
                }
            } else if (!tag.endsWith('/>')) {
                const tagNameMatch = tag.match(/<([a-zA-Z0-9]+)/);
                if (tagNameMatch) {
                    const tagName = tagNameMatch[1];
                    // Ignore self-closing logic for non-JSX tags if needed, but this is React
                    if (!['img', 'br', 'hr', 'input'].includes(tagName)) {
                        stack.push({ name: tagName, line: lineNum });
                    }
                }
            }
        });
    }
});

stack.forEach(s => {
    results.push(`Unclosed tag <${s.name}> opened at line ${s.line}`);
});

console.log(results.join('\n'));
