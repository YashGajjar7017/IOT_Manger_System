import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Prefill the 3 state URLs with the user's templates (ctype=1,2,3 with {IEMI} and {passowrd})
old_states = """  const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=1&PROJCD=re');
  const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=2&PROJCD=re');
  const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re');"""

new_states = """  const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=1&PROJCD=re');
  const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=2&PROJCD=re');
  const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=3&PROJCD=re');"""

if old_states in content:
    content = content.replace(old_states, new_states)
else:
    # Try singular replaces if they were formatted slightly differently
    content = content.replace(
        "const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=1&PROJCD=re');",
        "const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=1&PROJCD=re');"
    )
    content = content.replace(
        "const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=2&PROJCD=re');",
        "const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=2&PROJCD=re');"
    )
    content = content.replace(
        "const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re');",
        "const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=3&PROJCD=re');"
    )

# 2. Update formatUrl inside startCertProvisioning to handle {IEMI} and {passowrd}
old_format = """    const formatUrl = (url) => {
      return url
        .replace(/\\{IMEI\\}/gi, imeiInput)
        .replace(/\\{IEMI\\}/gi, imeiInput) // Handle IMEI vs IEMI typo
        .replace(/\\{PASSWORD\\}/gi, passwordInput)
        .replace(/\\{PASS\\}/gi, passwordInput); // Handle PASS vs PASSWORD template
    };"""

new_format = """    const formatUrl = (url) => {
      const activeImei = imeiProvisionInput || imeiInput || '';
      const activePass = passwordProvisionInput || passwordInput || '';
      return url
        .replace(/\\{IMEI\\}/gi, activeImei)
        .replace(/\\{IEMI\\}/gi, activeImei)
        .replace(/\\{PASSWORD\\}/gi, activePass)
        .replace(/\\{PASS\\}/gi, activePass)
        .replace(/\\{passowrd\\}/gi, activePass);
    };"""

content = content.replace(old_format, new_format)

# Also update startCertProvisioning validations to check for imeiProvisionInput / passwordProvisionInput
old_validation = """    // Check if IMEI and Password inputs are provided since they are used in formatting (Requirement 4)
    if (!imeiInput || !passwordInput) {
      alert('Please provide IMEI and Password inputs (in Security & Config) to format certificate URLs.');
      return;
    }"""

new_validation = """    // Check if IMEI and Password inputs are provided since they are used in formatting
    const checkImei = imeiProvisionInput || imeiInput;
    const checkPass = passwordProvisionInput || passwordInput;
    if (!checkImei || !checkPass) {
      alert('Please provide IMEI and Password to format certificate URLs.');
      return;
    }"""

content = content.replace(old_validation, new_validation)

# Also, inside startCertProvisioning, ipcRenderer.send should pass the target
old_ipc_send = """    ipcRenderer.send('download-and-provision-certs', {
      urls: {
        'aws_root_ca.pem': formatUrl(certRootCaUrl),
        'device_cert.crt': formatUrl(certDeviceCertUrl),
        'private_key.key': formatUrl(certPrivateKeyUrl)
      },
      ip: wifiIp,
      port: otaPort
    });"""

new_ipc_send = """    ipcRenderer.send('download-and-provision-certs', {
      urls: {
        'aws_root_ca.pem': formatUrl(certRootCaUrl),
        'device_cert.crt': formatUrl(certDeviceCertUrl),
        'private_key.key': formatUrl(certPrivateKeyUrl)
      },
      ip: gatewayIpProvisionInput || wifiIp,
      port: otaPort,
      target: certTarget
    });"""

content = content.replace(old_ipc_send, new_ipc_send)

# 3. Modify triggerCertificateProvision in App.jsx to call startCertProvisioning directly
# so that the user gets the beautiful real-time steps and green success dashboard on page-cert-provision!
old_trigger = """  const triggerCertificateProvision = async () => {
    if (!imeiProvisionInput || !passwordProvisionInput || !gatewayIpProvisionInput) {
      alert('IMEI, Password, and Gateway IP are required.');
      return;
    }
    setIsProvisioning(true);
    setProvisioningStatus('Initiating secure download from SCADA server...');
    addLogLine(`[EXPRESS CLIENT] POSTing certificate provision request for IMEI: ${imeiProvisionInput}...`);

    try {
      const res = await fetch('/api/certificates/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: imeiProvisionInput,
          password: passwordProvisionInput,
          gatewayIp: gatewayIpProvisionInput
        })
      });

      const result = await res.json();
      if (res.ok) {
        setProvisioningStatus('Success! Certificates provisioned to ESP32 SPIFFS & QCOM synced.');
        addLogLine('[EXPRESS CLIENT] SUCCESS: Certificate provisioning completed.', 'success');
        alert('Certificates provisioned successfully!');
        fetchCertProvisionHistory();
        sendControlCommand('GET_INFO');
      } else {
        setProvisioningStatus(`Error: ${result.error || 'Failed'}`);
        addLogLine(`[EXPRESS CLIENT ERROR] ${result.error || 'Failed'}`, 'error');
        alert(`Provisioning Failed:\\n${result.error || 'Unknown error'}`);
        fetchCertProvisionHistory();
      }
    } catch (err) {
      setProvisioningStatus(`Error: ${err.message}`);
      addLogLine(`[EXPRESS CLIENT ERROR] ${err.message}`, 'error');
      alert(`Provisioning Failed:\\n${err.message}`);
      fetchCertProvisionHistory();
    } finally {
      setIsProvisioning(false);
    }
  };"""

new_trigger = """  const triggerCertificateProvision = async () => {
    if (!imeiProvisionInput || !passwordProvisionInput || !gatewayIpProvisionInput) {
      alert('IMEI, Password, and Gateway IP are required.');
      return;
    }
    setIsProvisioning(true);
    setProvisioningStatus('Starting secure provisioning...');
    addLogLine(`[PROVISION] Starting certificate provisioning for IMEI: ${imeiProvisionInput}...`);
    
    // Call the step-by-step IPC provisioner
    startCertProvisioning();
  };"""

content = content.replace(old_trigger, new_trigger)

# Let's write this back to App.jsx
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Part 1 of App.jsx patched successfully")
