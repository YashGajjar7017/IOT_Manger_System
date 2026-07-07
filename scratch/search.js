const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, '..', 'src', 'App.jsx');
if (!fs.existsSync(appJsxPath)) {
  console.error('App.jsx not found at ' + appJsxPath);
  process.exit(1);
}

const content = fs.readFileSync(appJsxPath, 'utf8');
const lines = content.split('\n');

function findPattern(pattern) {
  console.log(`=== Matches for pattern: ${pattern} ===`);
  const regex = new RegExp(pattern, 'i');
  lines.forEach((line, idx) => {
    if (regex.test(line)) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

const args = process.argv.slice(2);
if (args.length > 0) {
  args.forEach(arg => findPattern(arg));
} else {
  // Default searches
  findPattern('run all test');
  findPattern('dbHistory');
  findPattern('pingLatency');
  findPattern('github');
  findPattern('temp');
}
