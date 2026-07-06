import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_injection = '''
  // Login / Signup State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuth = async () => {
    setAuthError('');
    try {
      const result = await ipcRenderer.invoke(authMode === 'login' ? 'admin-login' : 'admin-signup', { username: authUsername, password: authPassword });
      if (result.success) {
        if (authMode === 'login') setIsLoggedIn(true);
        else setAuthMode('login'); // switch to login after signup
      } else {
        setAuthError(result.message);
      }
    } catch (e) {
      setAuthError(e.message);
    }
  };
'''

modal_injection = '''
      {!isLoggedIn && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-terminal)', padding: '30px', borderRadius: '10px', width: '300px', border: '1px solid var(--accent-primary)' }}>
            <h2 style={{ color: 'var(--text-white)', marginBottom: '20px' }}>{authMode === 'login' ? 'Login' : 'Signup'}</h2>
            <input type="text" placeholder="Username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)' }} />
            <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)' }} />
            {authError && <div style={{ color: 'var(--accent-red)', marginBottom: '10px', fontSize: '12px' }}>{authError}</div>}
            <button onClick={handleAuth} style={{ width: '100%', padding: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' }}>
              {authMode === 'login' ? 'Login' : 'Signup'}
            </button>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
              {authMode === 'login' ? 'Create an account' : 'Already have an account? Login'}
            </div>
          </div>
        </div>
      )}
'''

content = content.replace("const [dbSubTab, setDbSubTab] = useState('tab-db-history');", "const [dbSubTab, setDbSubTab] = useState('tab-db-history');" + state_injection)

# find the main return ( 
idx = content.find('\n  return (\n')
if idx != -1:
    content = content[:idx+12] + modal_injection + content[idx+12:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
