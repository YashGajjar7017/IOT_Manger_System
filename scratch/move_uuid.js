const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Locate and extract the UUID Presets Manager block
const blockStartStr = '                {/* UUID Presets manager (5 slots) */}';
const blockEndStr = '                </div>\n              </div>\n\n              {/* Provisioning Verification Stepper */}';

const startIdx = content.indexOf(blockStartStr);
if (startIdx === -1) {
  console.log('Error: Could not find start of UUID Presets manager');
  process.exit(1);
}

const endIdx = content.indexOf(blockEndStr, startIdx);
if (endIdx === -1) {
  console.log('Error: Could not find end of UUID Presets manager');
  process.exit(1);
}

// Extract the block including the closing div of the manager itself (which is before the closing card div)
// Let's refine the end index to be exactly the end of the manager container.
// The blockEndStr has the closing card div `              </div>` and the next section header `              {/* Provisioning Verification Stepper */}`
// So the last closing tag of the manager is `                </div>`
const lastDivClose = '                </div>\n';
const managerEndIdx = content.lastIndexOf(lastDivClose, endIdx);
const managerBlock = content.substring(startIdx, managerEndIdx + lastDivClose.length);

console.log('Extracted manager block successfully!');

// Remove the manager block from its original position
content = content.substring(0, startIdx) + content.substring(managerEndIdx + lastDivClose.length);

// 2. Locate target insert position
const targetInsertStr = `                <button
                  className="btn btn-accent"
                  onClick={handleUploadConfigPartition}`;

const targetIdx = content.indexOf(targetInsertStr);
if (targetIdx === -1) {
  console.log('Error: Could not find target button location in Partition Configuration card');
  process.exit(1);
}

// We want to insert the manager block right before the button, with correct spacing
content = content.substring(0, targetIdx) + managerBlock + '\n' + content.substring(targetIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('UUID presets slot manager relocated successfully!');
