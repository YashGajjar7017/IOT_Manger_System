const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const query = process.argv[2];
if (!query) {
  console.log('Please provide a search term');
  process.exit(1);
}

console.log(`Searching for "${query}" in App.jsx...`);
const lines = content.split('\n');
let count = 0;
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`${idx + 1}: ${line.trim()}`);
    count++;
    if (count > 20) {
      console.log('... truncated (first 20 matches)');
      process.exit(0);
    }
  }
});
