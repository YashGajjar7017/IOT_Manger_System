const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update initial state of consoleLogs
const originalStateStr = `  const [consoleLogs, setConsoleLogs] = useState([
    { text: 'System Initialized. Awaiting interface connectivity...', type: 'system', time: new Date().toLocaleTimeString() }
  ]);`;

const newStateStr = `  const [consoleLogs, setConsoleLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('consoleLogs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { text: 'System Initialized. Awaiting interface connectivity...', type: 'system', time: new Date().toLocaleTimeString() }
    ];
  });`;

if (content.indexOf(originalStateStr) === -1) {
  console.log('Error: Could not find original consoleLogs state declaration');
  process.exit(1);
}
content = content.replace(originalStateStr, newStateStr);

// 2. Insert hooks right after consoleEndRef
const refStr = `  const consoleEndRef = useRef(null);`;
const hooksStr = `
  const consoleLogsRef = useRef(consoleLogs);
  useEffect(() => {
    consoleLogsRef.current = consoleLogs;
    localStorage.setItem('consoleLogs', JSON.stringify(consoleLogs));
  }, [consoleLogs]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'consoleLogs' && e.newValue) {
        if (e.newValue === JSON.stringify(consoleLogsRef.current)) {
          return;
        }
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setConsoleLogs(parsed);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);`;

const refIdx = content.indexOf(refStr);
if (refIdx === -1) {
  console.log('Error: Could not find consoleEndRef');
  process.exit(1);
}
content = content.substring(0, refIdx + refStr.length) + hooksStr + content.substring(refIdx + refStr.length);

// 3. Insert isPopoutTerminal logic before return
const returnStr = `  return (
    <>`;
const popoutRenderStr = `  const isPopoutTerminal = window.location.search.includes('popout=terminal');

  if (isPopoutTerminal) {
    return (
      <div className="page-view active" style={{ height: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', background: '#070b16' }}>
        <header className="view-header" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1>Engineering Debug Console (Popout)</h1>
            <p>Diagnostic logging stream monitoring active serial interfaces and raw socket frames</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary small" style={{ width: 'auto' }} onClick={handleSaveConsoleLogs}>Export Logs</button>
            <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={() => setConsoleLogs([])}>Clear Terminal</button>
          </div>
        </header>

        <div className="console-box" style={{ flex: '1 1 auto', height: '0', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
          <div className="console-terminal" style={{ flex: 1, overflowY: 'auto' }}>
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={'terminal-line ' + log.type}>
                {'[' + log.time + '] ' + log.text}
              </div>
            ))}
            <div ref={consoleEndRef}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>`;

const returnIdx = content.indexOf(returnStr);
if (returnIdx === -1) {
  console.log('Error: Could not find main return statement');
  process.exit(1);
}
content = content.substring(0, returnIdx) + popoutRenderStr + content.substring(returnIdx + returnStr.length);

// 4. Update the sidebar navigation button
const originalNavBtn = `            <button className={\`header-nav-item \${activeTab === \'page-console\' ? \'active\' : \'\'}\`} onClick={() => setActiveTab(\'page-console\')}>`;
const newNavBtn = `            <button
              className={\`header-nav-item \${activeTab === 'page-console' ? 'active' : ''}\`}
              onClick={() => setActiveTab('page-console')}
              draggable={true}
              onDragStart={() => ipcRenderer.send('open-terminal-window')}
              title="Click to view, or Drag to pop out into a separate window"
            >`;

if (content.indexOf(originalNavBtn) === -1) {
  console.log('Error: Could not find original console navigation button');
  process.exit(1);
}
content = content.replace(originalNavBtn, newNavBtn);

// 5. Update the page-console header
const originalHeader = `          <section id="page-console" className={\`page-view \${activeTab === 'page-console' ? 'active' : ''}\`}>
            <header className="view-header">
              <div>
                <h1>Engineering Debug Console</h1>
                <p>Diagnostic logging stream monitoring active serial interfaces and raw socket frames</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary small" style={{ width: 'auto' }} onClick={handleSaveConsoleLogs}>Export Logs</button>
                <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={() => setConsoleLogs([])}>Clear Terminal</button>
              </div>
            </header>`;

const newHeader = `          <section id="page-console" className={\`page-view \${activeTab === 'page-console' ? 'active' : ''}\`}>
            <header className="view-header" draggable={true} onDragStart={() => ipcRenderer.send('open-terminal-window')} title="Drag this header to pop out the console terminal" style={{ cursor: 'grab' }}>
              <div>
                <h1>Engineering Debug Console</h1>
                <p>Diagnostic logging stream monitoring active serial interfaces and raw socket frames</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-accent small" style={{ width: 'auto' }} onClick={() => ipcRenderer.send('open-terminal-window')} title="Pop out debug console to a separate floating window">↗ Pop Out</button>
                <button className="btn btn-secondary small" style={{ width: 'auto' }} onClick={handleSaveConsoleLogs}>Export Logs</button>
                <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={() => setConsoleLogs([])}>Clear Terminal</button>
              </div>
            </header>`;

if (content.indexOf(originalHeader) === -1) {
  console.log('Error: Could not find original console page header');
  process.exit(1);
}
content = content.replace(originalHeader, newHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Terminal popout logic applied successfully!');
