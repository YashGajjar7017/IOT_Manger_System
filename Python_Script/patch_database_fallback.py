import os

with open('database.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Locate: // Admin User Schema
idx = code.find("// Admin User Schema")
if idx == -1:
    print("Could not find Admin User Schema start")
    exit(1)

new_db_end = """// Admin User Schema
const AdminSchema = new mongoose.Schema({ 
  username: { type: String, required: true, unique: true }, 
  password: { type: String, required: true } 
});
const AdminModel = mongoose.model('AdminUser', AdminSchema);

const fs = require('fs');
const path = require('path');
const OFFLINE_CREDENTIALS_PATH = path.join(__dirname, 'scratch', 'admin_credentials.json');

function getOfflineCredentials() {
  try {
    if (fs.existsSync(OFFLINE_CREDENTIALS_PATH)) {
      return JSON.parse(fs.readFileSync(OFFLINE_CREDENTIALS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[DATABASE] Failed to read offline credentials:', e);
  }
  return [{ username: 'admin', password: 'admin_secure_gate' }];
}

function saveOfflineCredentials(users) {
  try {
    const dir = path.dirname(OFFLINE_CREDENTIALS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(OFFLINE_CREDENTIALS_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('[DATABASE] Failed to save offline credentials:', e);
  }
}

async function createAdminUser(username, password) { 
  if (!mongodbConnected) {
    try {
      const users = getOfflineCredentials();
      const existing = users.find(u => u.username === username);
      if (existing) return { success: false, message: 'User exists' };
      users.push({ username, password });
      saveOfflineCredentials(users);
      return { success: true, message: 'Signup successful (Offline Mode)' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  try { 
    const existing = await AdminModel.findOne({ username }); 
    if (existing) return { success: false, message: 'User exists' }; 
    await AdminModel.create({ username, password }); 
    return { success: true, message: 'Signup successful' }; 
  } catch (e) { 
    return { success: false, message: e.message }; 
  } 
}

async function verifyAdminUser(username, password) { 
  if (!mongodbConnected) {
    try {
      const users = getOfflineCredentials();
      const user = users.find(u => u.username === username && u.password === password);
      if (user) return { success: true, message: 'Login successful (Offline Mode)' };
      return { success: false, message: 'Invalid credentials' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  try { 
    const user = await AdminModel.findOne({ username, password }); 
    if (user) return { success: true, message: 'Login successful' }; 
    return { success: false, message: 'Invalid credentials' }; 
  } catch (e) { 
    return { success: false, message: e.message }; 
  } 
}

module.exports.createAdminUser = createAdminUser;
module.exports.verifyAdminUser = verifyAdminUser;
module.exports.getDbStatus = () => ({ connected: mongodbConnected });
"""

patched_code = code[:idx] + new_db_end

with open('database.js', 'w', encoding='utf-8') as f:
    f.write(patched_code)

print("database.js patched with offline JSON fallback support.")
