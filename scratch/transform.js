const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

function findBlock(startStr, endStr) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) {
    console.log(`Could not find start: ${startStr}`);
    return null;
  }
  const endIdx = content.indexOf(endStr, startIdx + startStr.length);
  if (endIdx === -1) {
    console.log(`Could not find end for start: ${startStr}`);
    return null;
  }
  return {
    startIdx,
    endIdx: endIdx + endStr.length,
    content: content.substring(startIdx, endIdx + endStr.length)
  };
}

const p1 = findBlock('              {/* Interface Control Panel */}\n              <div className="glass-card connection-panel">', '                    </div>\n                  </div>\n                )}\n              </div>');
const p2 = findBlock('              {/* Diagnostic Checklist Panel */}\n              <div className="glass-card diagnostic-board">', '                </div>\n              </div>');
const p3 = findBlock('              {/* Detected Devices Panel */}\n              <div className="glass-card detected-devices-panel">', '                  </div>\n                )}\n              </div>');
const p4 = findBlock('                {/* Direct AP Diagnostics & Manual Socket Link */}\n                <div className="glass-card direct-ap-panel">', '                  )}\n                </div>');
const p5 = findBlock('                {/* Direct HTTP Configurator & Tech Specs */}\n                <div className="glass-card direct-config-panel"', '                  </div>\n                </div>');
const p6 = findBlock('            {/* Wireless Gateway Client Devices (SoftAP Stations) */}\n            <div className="glass-card ap-clients-panel"', '                </div>\n              )}\n            </div>');

if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
  console.log('Error: One or more blocks not found');
  process.exit(1);
}

// Enhance blocks with draggable support
const p1_drag = p1.content.replace(
  '<div className="glass-card connection-panel">',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'connection-panel')} onDragOver={(e) => handleCardDragOver(e, 'connection-panel')} onDragLeave={(e) => handleCardDragLeave(e, 'connection-panel')} onDrop={(e) => handleCardDrop(e, 'connection-panel')} onDragEnd={handleCardDragEnd} className={\`glass-card connection-panel \${draggedOverCardId === 'connection-panel' ? 'drag-over' : ''}\`}>`
);

const p2_drag = p2.content.replace(
  '<div className="glass-card diagnostic-board">',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'diagnostic-board')} onDragOver={(e) => handleCardDragOver(e, 'diagnostic-board')} onDragLeave={(e) => handleCardDragLeave(e, 'diagnostic-board')} onDrop={(e) => handleCardDrop(e, 'diagnostic-board')} onDragEnd={handleCardDragEnd} className={\`glass-card diagnostic-board \${draggedOverCardId === 'diagnostic-board' ? 'drag-over' : ''}\`}>`
);

const p3_drag = p3.content.replace(
  '<div className="glass-card detected-devices-panel">',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'detected-devices-panel')} onDragOver={(e) => handleCardDragOver(e, 'detected-devices-panel')} onDragLeave={(e) => handleCardDragLeave(e, 'detected-devices-panel')} onDrop={(e) => handleCardDrop(e, 'detected-devices-panel')} onDragEnd={handleCardDragEnd} className={\`glass-card detected-devices-panel \${draggedOverCardId === 'detected-devices-panel' ? 'drag-over' : ''}\`}>`
);

const p4_drag = p4.content.replace(
  '<div className="glass-card direct-ap-panel">',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'direct-ap-panel')} onDragOver={(e) => handleCardDragOver(e, 'direct-ap-panel')} onDragLeave={(e) => handleCardDragLeave(e, 'direct-ap-panel')} onDrop={(e) => handleCardDrop(e, 'direct-ap-panel')} onDragEnd={handleCardDragEnd} className={\`glass-card direct-ap-panel \${draggedOverCardId === 'direct-ap-panel' ? 'drag-over' : ''}\`}>`
);

const p5_drag = p5.content.replace(
  '<div className="glass-card direct-config-panel"',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'direct-config-panel')} onDragOver={(e) => handleCardDragOver(e, 'direct-config-panel')} onDragLeave={(e) => handleCardDragLeave(e, 'direct-config-panel')} onDrop={(e) => handleCardDrop(e, 'direct-config-panel')} onDragEnd={handleCardDragEnd} className={\`glass-card direct-config-panel \${draggedOverCardId === 'direct-config-panel' ? 'drag-over' : ''}\``
);

const p6_drag = p6.content.replace(
  '<div className="glass-card ap-clients-panel"',
  `<div draggable={true} onDragStart={(e) => handleCardDragStart(e, 'ap-clients-panel')} onDragOver={(e) => handleCardDragOver(e, 'ap-clients-panel')} onDragLeave={(e) => handleCardDragLeave(e, 'ap-clients-panel')} onDrop={(e) => handleCardDrop(e, 'ap-clients-panel')} onDragEnd={handleCardDragEnd} className={\`glass-card ap-clients-panel \${draggedOverCardId === 'ap-clients-panel' ? 'drag-over' : ''}\``
);

// Define components before return statement
const declarations = `
  const connectionPanelCard = (
    ${p1_drag.trim()}
  );

  const diagnosticBoardCard = (
    ${p2_drag.trim()}
  );

  const detectedDevicesPanelCard = (
    ${p3_drag.trim()}
  );

  const directApPanelCard = (
    ${p4_drag.trim()}
  );

  const directConfigPanelCard = (
    ${p5_drag.trim()}
  );

  const apClientsPanelCard = (
    ${p6_drag.trim()}
  );

  const renderDashboardCard = (cardId) => {
    if (cardId === 'connection-panel') return connectionPanelCard;
    if (cardId === 'diagnostic-board') return diagnosticBoardCard;
    if (cardId === 'detected-devices-panel') return detectedDevicesPanelCard;
    if (cardId === 'direct-ap-panel') return directApPanelCard;
    if (cardId === 'direct-config-panel') return directConfigPanelCard;
    if (cardId === 'ap-clients-panel') return apClientsPanelCard;
    return null;
  };
`;

const returnStatementIdx = content.indexOf('  return (\n    <>');
if (returnStatementIdx === -1) {
  console.log('Error: Could not find return statement');
  process.exit(1);
}

// Perform injection of card variables
content = content.substring(0, returnStatementIdx) + declarations + '\n' + content.substring(returnStatementIdx);

// Now perform substitution of the original grid contents
const topGridStartStr = '            <div className="dashboard-top-grid">';
const topGridStartIdx = content.indexOf(topGridStartStr);
if (topGridStartIdx === -1) {
  console.log('Error: Could not find top grid start');
  process.exit(1);
}

// Find index after top grid start
const replaceStartIdx = topGridStartIdx + topGridStartStr.length;

// Find the end index to replace: p6 content is still in the file at this point
const originalP6EndIdx = content.indexOf(p6.content) + p6.content.length;

const replacementLayoutCode = `
              {dashboardLayout.slice(0, 3).map(id => renderDashboardCard(id))}
            </div>

            {connectionMode !== 'ap' && (
              <div className="dashboard-middle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
                {dashboardLayout.slice(3, 5).map(id => renderDashboardCard(id))}
              </div>
            )}

            {renderDashboardCard(dashboardLayout[5])}`;

content = content.substring(0, replaceStartIdx) + replacementLayoutCode + content.substring(originalP6EndIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard re-ordering implementation applied successfully!');
