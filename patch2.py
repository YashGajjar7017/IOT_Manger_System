import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Target Options State
target_state_injection = '''
  const [certTarget, setCertTarget] = useState('esp32');
'''
content = content.replace("const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re');", "const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re');" + target_state_injection)

# 2. Modify download-and-provision-certs to pass the target
content = content.replace("ip: wifiIp,\n        port: otaPort", "ip: wifiIp,\n        port: otaPort,\n        target: certTarget")

# 3. Add UI for Target Options and Provisioning Status
ui_injection = '''
                    <div className="input-group">
                      <label>Target Device for Certificates</label>
                      <select value={certTarget} onChange={(e) => setCertTarget(e.target.value)} disabled={isDownloadingCerts}>
                        <option value="esp32">ESP32 (SPIFFS/LittleFS)</option>
                        <option value="qcom">Qualcomm / QCOM Directly</option>
                      </select>
                    </div>
'''
content = content.replace('<button className="action-button primary" onClick={startCertProvisioning} disabled={isDownloadingCerts || isProvisioning}>', ui_injection + '\n<button className="action-button primary" onClick={startCertProvisioning} disabled={isDownloadingCerts || isProvisioning}>')

# 4. Add DB connection URL and insert button in Database History section
db_ui_injection = '''
                  <div className="db-manual-insert" style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '15px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: 'var(--accent-primary)' }}>MongoDB Connection & Manual Insert</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input type="text" placeholder="MongoDB URL" value={appConfig?.mongoUri || dbUriInput} onChange={(e) => setDbUriInput(e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }} />
                      <button className="action-button primary" onClick={handleReconnectDb}>Connect</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="action-button secondary" onClick={() => alert('Manual insert logic goes here!')}>Manual Insert Test Record</button>
                    </div>
                  </div>
'''
content = content.replace('<div className="db-records-list">', db_ui_injection + '\n<div className="db-records-list">')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
