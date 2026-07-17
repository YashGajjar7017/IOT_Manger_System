const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// The problem: transform.js injected {/* comment */} nodes inside parenthesized 
// variable assignments, which is invalid JSX. 
// We need to remove just those comment lines from each const = (...) block.

const cards = [
  ['connection-panel', 'connection-panel'],
  ['diagnostic-board', 'diagnostic-board'],
  ['detected-devices-panel', 'detected-devices-panel'],
  ['direct-ap-panel', 'direct-ap-panel'],
  ['direct-config-panel', 'direct-config-panel'],
  ['ap-clients-panel', 'ap-clients-panel'],
];

const cardVarNames = [
  'connectionPanelCard',
  'diagnosticBoardCard',
  'detectedDevicesPanelCard',
  'directApPanelCard',
  'directConfigPanelCard',
  'apClientsPanelCard',
];

// Pattern: const XxxCard = (\n    {/* ... */}\n              <div
// We need to remove the {/* ... */} comment line
let fixCount = 0;
for (const varName of cardVarNames) {
  const varStart = `  const ${varName} = (\n`;
  const idx = content.indexOf(varStart);
  if (idx === -1) {
    console.log(`Could not find: ${varName}`);
    continue;
  }
  // Find the text just after the opening paren
  const afterParen = idx + varStart.length;
  // Check if next line is a JSX comment {/* ... */}
  const nextNewline = content.indexOf('\n', afterParen);
  const firstLine = content.substring(afterParen, nextNewline).trim();
  if (firstLine.startsWith('{/*') && firstLine.endsWith('*/}')) {
    // Remove that line (including leading whitespace and newline)
    content = content.substring(0, afterParen) + content.substring(nextNewline + 1);
    console.log(`Fixed: ${varName}`);
    fixCount++;
  } else {
    console.log(`No comment on first line for ${varName}: "${firstLine.substring(0, 50)}"`);
  }
}

console.log(`\nFixed ${fixCount} card variable declarations.`);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
