with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's target the page-cert-provision section.
# We will replace the entire "Form Card" (<div className="glass-card"> ... </div>) around line 4095-4169.
# Let's locate the card starts with:
#               {/* Form Card */}
#               <div className="glass-card">
#                 <h3><span className="icon">🔑</span> Request SCADA Certificates</h3>

start_marker = """              {/* Form Card */}
              <div className="glass-card">"""

# And locate the end of this card:
#                 {provisioningStatus && (
#                   <div style={{ marginTop: '15px', fontSize: '12.5px', color: provisioningStatus.startsWith('Success') ? '#00ff66' : provisioningStatus.startsWith('Error') ? '#ff3366' : '#00ffff', fontFamily: 'var(--font-mono)' }}>
#                     • {provisioningStatus}
#                   </div>
#                 )}
#               </div>

# Let's define the new card HTML that will replace it:
new_card = """              {/* Form Card */}
              <div className="glass-card" style={{
                transition: 'all 0.5s ease',
                borderColor: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '#00ff66' : 'var(--glass-border)',
                boxShadow: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '0 0 25px rgba(0, 255, 100, 0.25)' : 'var(--glow-theme)'
              }}>
                <h3><span className="icon">🔑</span> SCADA Credentials & Target</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Select the target storage and enter credentials to pull certificates from the SCADA system.
                </p>

                <div className="input-group">
                  <label>Storage Target Option</label>
                  <select 
                    value={certTarget} 
                    onChange={(e) => setCertTarget(e.target.value)} 
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                  >
                    <option value="esp32">1. Store into ESP32 SPIFFS + co-processor sync</option>
                    <option value="qcom">2. Store directly to QCOM co-processor</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group">
                    <label>Device IMEI ID</label>
                    <input
                      type="text"
                      value={imeiProvisionInput}
                      onChange={(e) => setImeiProvisionInput(e.target.value)}
                      placeholder="e.g. 866738083623502"
                    />
                  </div>
                  <div className="input-group">
                    <label>SCADA Password</label>
                    <input
                      type="password"
                      value={passwordProvisionInput}
                      onChange={(e) => setPasswordProvisionInput(e.target.value)}
                      placeholder="User Password"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>ESP32 Gateway IP Address</label>
                  <input
                    type="text"
                    value={gatewayIpProvisionInput}
                    onChange={(e) => setGatewayIpProvisionInput(e.target.value)}
                    placeholder="e.g. 192.168.0.1"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={triggerCertificateProvision}
                  disabled={isProvisioning || isDownloadingCerts}
                  style={{ marginTop: '10px', width: '100%', background: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '#00cc55' : 'var(--accent-primary)' }}
                >
                  {isDownloadingCerts ? 'Processing Provisioning...' : 'Start Secure Provisioning'}
                </button>

                {/* All Acknowledgement Steps & Logs on Single Page */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--accent-pink)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Provisioning Verification Stepper
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>1. Fetch Root CA (rootCA.pem)</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: certStatuses['aws_root_ca.pem'] === 'success' ? '#00ff66' : 
                               certStatuses['aws_root_ca.pem'] === 'downloading' ? '#00ffff' : 
                               certStatuses['aws_root_ca.pem'] === 'failed' ? '#ff3366' : '#707090' 
                      }}>
                        {certStatuses['aws_root_ca.pem'] === 'success' ? '✔ SUCCESS' : 
                         certStatuses['aws_root_ca.pem'] === 'downloading' ? '⌛ FETCHING...' : 
                         certStatuses['aws_root_ca.pem'] === 'failed' ? '❌ ERROR' : '💤 PENDING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>2. Fetch Client Cert (client.pem)</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: certStatuses['device_cert.crt'] === 'success' ? '#00ff66' : 
                               certStatuses['device_cert.crt'] === 'downloading' ? '#00ffff' : 
                               certStatuses['device_cert.crt'] === 'failed' ? '#ff3366' : '#707090' 
                      }}>
                        {certStatuses['device_cert.crt'] === 'success' ? '✔ SUCCESS' : 
                         certStatuses['device_cert.crt'] === 'downloading' ? '⌛ FETCHING...' : 
                         certStatuses['device_cert.crt'] === 'failed' ? '❌ ERROR' : '💤 PENDING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>3. Fetch Private Key (key.pem)</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: certStatuses['private_key.key'] === 'success' ? '#00ff66' : 
                               certStatuses['private_key.key'] === 'downloading' ? '#00ffff' : 
                               certStatuses['private_key.key'] === 'failed' ? '#ff3366' : '#707090' 
                      }}>
                        {certStatuses['private_key.key'] === 'success' ? '✔ SUCCESS' : 
                         certStatuses['private_key.key'] === 'downloading' ? '⌛ FETCHING...' : 
                         certStatuses['private_key.key'] === 'failed' ? '❌ ERROR' : '💤 PENDING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                      <span>4. Write to Device storage target</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '#00ff66' : 
                               isDownloadingCerts ? '#00ffff' : '#707090' 
                      }}>
                        {(certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '✔ WRITTEN' : 
                         isDownloadingCerts ? '⌛ WRITING...' : '💤 PENDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {provisioningStatus && (
                  <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '12px', color: '#00ffff', fontFamily: 'var(--font-mono)' }}>
                    {provisioningStatus}
                  </div>
                )}
              </div>"""

# Replace the Form Card in content
# We will find start_marker and then find the closing </div> of that card.
# To find the matching closing div of `glass-card`, we can count nesting depth.
start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find Form Card start marker")
    exit(1)

# Count curly braces / HTML tag nesting
idx = start_idx + len(start_marker)
div_depth = 1
while div_depth > 0 and idx < len(content):
    if content[idx:idx+4] == '<div':
        div_depth += 1
    elif content[idx:idx+5] == '</div':
        div_depth -= 1
    idx += 1

end_idx = idx

content = content[:start_idx] + new_card + content[end_idx:]

# 4. Now let's patch the page-database section to include the connection URI input and Manual Insert Test Record button
# Let's locate the page-database section status card:
#               {/* Database status widget */}
#               <div className="glass-card db-status-card" style={{ marginBottom: '15px' }}>

db_widget_marker = """              {/* Database status widget */}
              <div className="glass-card db-status-card\" style={{ marginBottom: '15px' }}>"""

# If not found with escaping, try without:
if db_widget_marker not in content:
    db_widget_marker = """              {/* Database status widget */}
              <div className="glass-card db-status-card" style={{ marginBottom: '15px' }}>"""

db_start_idx = content.find(db_widget_marker)
if db_start_idx == -1:
    print("Could not find Database widget start marker")
    exit(1)

# Find the end of this widget card
db_idx = db_start_idx + len(db_widget_marker)
db_depth = 1
while db_depth > 0 and db_idx < len(content):
    if content[db_idx:db_idx+4] == '<div':
        db_depth += 1
    elif content[db_idx:db_idx+5] == '</div':
        db_depth -= 1
    db_idx += 1
db_end_idx = db_idx

# We will replace this status card with a layout containing status AND connection inputs + manual insert button
new_db_card = """              {/* Database status widget */}
              <div className="glass-card db-status-card" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: 'var(--accent-pink)', marginBottom: '5px' }}>MERN database state</h4>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: dbStatus.mongodb === 'CONNECTED' ? '#00ff66' : '#ff9900' }}>
                      {dbStatus.mongodb === 'CONNECTED' ? '🟢 MONGODB CONNECTED' : '🟡 MEMORY LOGGER FALLBACK'}
                    </span>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '10px' }}>MongoDB connection URL</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="text" 
                        value={dbUriInput} 
                        onChange={(e) => setDbUriInput(e.target.value)} 
                        style={{ fontSize: '11px', padding: '6px 10px', height: '28px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }} 
                      />
                      <button 
                        className="btn btn-secondary" 
                        style={{ height: '28px', minWidth: 'auto', padding: '0 10px', fontSize: '11px' }}
                        onClick={triggerDbReconnect}
                        disabled={isReconnectingDb}
                      >
                        {isReconnectingDb ? '...' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '30px', minWidth: 'auto', padding: '0 12px', fontSize: '11px', border: '1px dashed var(--accent-pink)' }}
                      onClick={async () => {
                        const randomRecord = {
                          count: 1,
                          devices: [{
                            id: Math.floor(Math.random() * 10) + 1,
                            temp: Math.floor(Math.random() * 15) + 20,
                            rssi: -Math.floor(Math.random() * 40) - 40,
                            bat: Math.floor(Math.random() * 40) + 60,
                            status: 'ACTIVE'
                          }]
                        };
                        try {
                          const res = await ipcRenderer.invoke('db-manual-insert', randomRecord);
                          if (res.success) {
                            alert('Successfully manually inserted telemetry snapshot record!');
                            // Refresh db history
                            ipcRenderer.send('reconnect-database', { uri: dbUriInput });
                          } else {
                            alert('Insertion failed: ' + res.error);
                          }
                        } catch (e) {
                          alert('Error calling manual insert: ' + e.message);
                        }
                      }}
                    >
                      ➕ Manual Insert Test
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      Logs: {dbHistory.length} snapshots
                    </span>
                  </div>
                </div>
              </div>"""

content = content[:db_start_idx] + new_db_card + content[db_end_idx:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully replaced View UI in App.jsx")
