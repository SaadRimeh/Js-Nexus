import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import MemoryBox from './components/MemoryBox';
import FileExplorer from './components/FileExplorer';
import AIErrorWidget from './components/AIErrorWidget';
import ApiTester from './components/ApiTester';
import EventLoopVisualizer from './components/EventLoopVisualizer';
import GitPanel from './components/GitPanel';
import AiChat from './components/AiChat';
import BrandLogo from './components/BrandLogo';

// ─── Sidebar Panel IDs ──────────────────────────────────────────────────────
const PANELS = [
  { id: 'files', icon: '📁', label: 'Files' },
  { id: 'git', icon: '🌿', label: 'Source Control' },
  { id: 'ai', icon: '🤖', label: 'AI Assistant' },
  { id: 'memory', icon: '🧠', label: 'Memory' },
  { id: 'events', icon: '🔄', label: 'Event Loop' },
  { id: 'api', icon: '🔌', label: 'API Tester' },
];

const BOILERPLATE = `// Welcome to JS Nexus ⚡
// A professional JavaScript IDE — fully offline

const greet = (name) => \`Hello, \${name}!\`;
console.log(greet("World"));

const scores = [95, 87, 72, 100];
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
console.log("Average score:", avg);
`;

// ─── Resizable Divider ─────────────────────────────────────────────────────
function VerticalDivider({ onDrag }) {
  const dragging = useRef(false);
  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
    const move = (ev) => { if (dragging.current) onDrag(ev.clientX); };
    const up = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', move);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
  };
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: '4px', flexShrink: 0, cursor: 'col-resize',
        backgroundColor: '#21262d',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#388bfd'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#21262d'}
    />
  );
}

function HorizontalDivider({ onDrag }) {
  const dragging = useRef(false);
  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
    const move = (ev) => { if (dragging.current) onDrag(ev.clientY); };
    const up = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', move);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
  };
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        height: '4px', flexShrink: 0, cursor: 'row-resize',
        backgroundColor: '#21262d',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#388bfd'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#21262d'}
    />
  );
}

// ─── Login Screen Component ──────────────────────────────────────────────────
function LoginScreen({ onLoginSuccess }) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = () => {
    window.api.openExternalUrl('https://ollama.com/signup');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMsg('Please enter your Ollama API Key.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await window.api.setApiKey(keyInput.trim());
      const res = await window.api.checkOllama();
      if (res.success) {
        localStorage.setItem('ollama_api_key', keyInput.trim());
        onLoginSuccess(keyInput.trim());
      } else {
        setErrorMsg('Invalid API Key or connection issue. Please make sure the key is correct and you are online.');
        await window.api.setApiKey('');
      }
    } catch (err) {
      setErrorMsg('An error occurred during verification. Please try again.');
      await window.api.setApiKey('');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalBypass = () => {
    localStorage.setItem('ollama_api_key', 'local_mode');
    onLoginSuccess('local_mode');
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1b1e2e 0%, #0d1117 100%)',
      fontFamily: "'Inter', sans-serif", color: '#e6edf3', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(137, 87, 229, 0.15)', filter: 'blur(80px)', top: '15%', left: '20%',
        animation: 'pulse 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', width: '250px', height: '250px', borderRadius: '50%',
        background: 'rgba(56, 139, 253, 0.12)', filter: 'blur(70px)', bottom: '20%', right: '20%',
        animation: 'pulse 8s ease-in-out infinite 2s'
      }} />

      <div style={{
        width: '420px', background: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(48, 54, 61, 0.8)', borderRadius: '16px', padding: '36px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(137, 87, 229, 0.15)',
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 10, boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <BrandLogo size={80} style={{ marginBottom: '16px' }} />
          <h1 style={{
            margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, letterSpacing: '1px',
            background: 'linear-gradient(135deg, #ffffff 0%, #8b949e 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>JS NEXUS</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#8b949e', lineHeight: '1.5' }}>
            Zero-config JavaScript execution combined with Cloud-hosted AI coding assistance.
          </p>
        </div>

        <div style={{
          background: 'rgba(13, 17, 23, 0.6)', borderRadius: '10px', padding: '16px',
          marginBottom: '24px', border: '1px solid rgba(48, 54, 61, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#c9d1d9', marginBottom: '12px' }}>
            <span>🚀</span> Get Started in 2 Steps:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#8b949e' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#ffd93d', fontWeight: 'bold' }}>1.</span>
              <span>
                Create a free account on{' '}
                <span
                  onClick={handleSignup}
                  style={{ color: '#58a6ff', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                >
                  ollama.com/signup ↗
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#ffd93d', fontWeight: 'bold' }}>2.</span>
              <span>Generate your API key in settings and paste it below.</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Ollama API Key
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your api_key here..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d',
                  borderRadius: '8px', padding: '10px 40px 10px 12px', fontSize: '13px',
                  color: '#e6edf3', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8957e5'}
                onBlur={(e) => e.target.style.borderColor = '#30363d'}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute', right: '12px', background: 'none', border: 'none',
                  color: '#8b949e', cursor: 'pointer', fontSize: '14px', padding: 0
                }}
              >
                {showKey ? '👁' : '👁‍🗨'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              fontSize: '12px', color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: '6px',
              padding: '8px 12px', lineHeight: 1.4, animation: 'fadeIn 0.2s ease'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', background: 'linear-gradient(135deg, #8957e5 0%, #6f42c1 100%)',
              border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(137, 87, 229, 0.3)',
              transition: 'transform 0.15s, opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? '⚡ Verifying Connection...' : 'Unlock IDE & Activate AI'}
          </button>
        </form>

        <div style={{
          textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#6e7681',
          display: 'flex', justifyContent: 'center', gap: '12px'
        }}>
          <span
            onClick={handleSignup}
            style={{ color: '#58a6ff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Go to Ollama.com
          </span>
          <span>•</span>
          <span
            onClick={handleLocalBypass}
            style={{ color: '#8b949e', cursor: 'pointer', textDecoration: 'underline' }}
            title="Bypass login to connect to a local Ollama daemon (localhost:11434)"
          >
            Use Local Offline Mode
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('ollama_api_key') || '');
  const [isApiKeySet, setIsApiKeySet] = useState(!!localStorage.getItem('ollama_api_key'));

  const [code, setCode] = useState(BOILERPLATE);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [stats, setStats] = useState(null);
  const [variables, setVariables] = useState(null);
  const [liveEval, setLiveEval] = useState(false); // silent live eval indicator

  // File system state
  const [rootPath, setRootPath] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [rootName, setRootName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]); // tabs
  const [activeTab, setActiveTab] = useState(null);
  const [unsaved, setUnsaved] = useState(new Set());

  // AI widget
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);

  // Execution Engine
  const [execEngine, setExecEngine] = useState('node');

  // Panel state
  const [activePanel, setActivePanel] = useState('files');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const terminalRef = useRef(null);
  const mainRef = useRef(null);
  const rightRef = useRef(null);

  // ─── File System & Saves ───────────────────────────────────────────────
  const openFolder = async () => {
    if (unsaved.size > 0 && !window.confirm('Open another workspace and discard all unsaved changes?')) return;
    try {
      const result = await window.api.openFolder();
      if (!result) return;
      if (result.root !== rootPath) {
        setSelectedFile(null);
        setOpenFiles([]);
        setActiveTab(null);
        setUnsaved(new Set());
        setCode(BOILERPLATE);
      }
      setRootPath(result.root);
      setFileTree(result.tree);
      setRootName(result.root.split(/[/\\]/).pop());
    } catch (error) {
      setHasError(true);
      setOutput(`Unable to open folder: ${error.message}`);
    }
  };

  const refreshFolder = useCallback(async () => {
    const result = await window.api.refreshFolder();
    if (result) {
      setRootPath(result.root);
      setFileTree(result.tree);
      setRootName(result.root.split(/[/\\]/).pop());
    }
  }, []);

  const openFileInEditor = async (node) => {
    if (node.isDir) return;
    const ext = node.name.split('.').pop()?.toLowerCase();
    const isEnv = node.name === '.env' || node.name.startsWith('.env.');
    const allowedExts = ['js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt', 'css', 'html', 'env', 'gitignore', 'yml', 'yaml'];
    if (!allowedExts.includes(ext) && !isEnv) return;

    setSelectedFile(node.path);

    // Check if already open
    if (openFiles.find(f => f.path === node.path)) {
      setActiveTab(node.path);
      return;
    }

    const res = await window.api.readFile(node.path);
    if (res.success) {
      const tab = { path: node.path, name: node.name, content: res.content };
      setOpenFiles(prev => [...prev, tab]);
      setActiveTab(node.path);
      setCode(res.content);
    }
  };

  const saveCurrentFile = useCallback(async () => {
    if (!activeTab) return true;
    const res = await window.api.writeFile(activeTab, code);
    if (res.success) {
      setUnsaved(prev => { const s = new Set(prev); s.delete(activeTab); return s; });
      setOpenFiles(prev => prev.map(file => file.path === activeTab ? { ...file, content: code } : file));
      return true;
    }
    setHasError(true);
    setOutput(`Unable to save file: ${res.error || 'Unknown file-system error.'}`);
    return false;
  }, [activeTab, code]);

  // ─── Code Execution ────────────────────────────────────────────────────
  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput(null);
    setHasError(false);
    setShowAI(false);
    setStats(null);
    setVariables(null);

    try {
      if (execEngine === 'node') {
        if (!activeTab) {
          // Fallback to VM Sandbox execution
          setOutput('⚠️ Running in Sandbox VM (No active file saved to disk for Node.js to run).\nTo run in Node.js, create and open a file in your workspace.\n\n');
          const res = await window.api.executeJS(code);
          setHasError(!res.success);
          setOutput(prev => (prev || '') + res.output);
          if (res.executionMs !== undefined) {
            setStats({ executionMs: res.executionMs, memoryUsedMB: res.memoryUsedMB });
          }
          if (res.variables) setVariables(res.variables);
          if (!res.success && res.errorRaw) {
            setAiError(res.errorRaw);
            setShowAI(true);
          }
        } else {
          // Node.js execution: save first, then also run sandbox to capture variables
          const didSave = await saveCurrentFile();
          if (!didSave) return;
          const res = await window.api.executeNode(activeTab);
          setHasError(!res.success);
          setOutput(res.output);
          if (res.executionMs !== undefined) {
            setStats({ executionMs: res.executionMs });
          }
          if (!res.success && res.errorRaw) {
            setAiError(res.errorRaw);
            setShowAI(true);
          }
          // Silent sandbox eval to populate Memory Box (Node.js doesn't return variables)
          try {
            const vmRes = await window.api.executeJS(code);
            if (vmRes.variables) setVariables(vmRes.variables);
          } catch (_) { /* silent */ }
        }
      } else {
        // Sandbox VM execution
        const res = await window.api.executeJS(code);
        setHasError(!res.success);
        setOutput(res.output);
        if (res.executionMs !== undefined) {
          setStats({ executionMs: res.executionMs, memoryUsedMB: res.memoryUsedMB });
        }
        if (res.variables) setVariables(res.variables);

        if (!res.success && res.errorRaw) {
          setAiError(res.errorRaw);
          setShowAI(true);
        }
      }
    } catch (err) {
      setHasError(true);
      setOutput('Error: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  }, [code, execEngine, activeTab, saveCurrentFile]);

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentFile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveCurrentFile]);

  // ─── Live Auto-Evaluation (debounced, silent) ─────────────────────────
  useEffect(() => {
    // Only run in sandbox — Node.js requires a saved file
    setLiveEval(true);
    const timer = setTimeout(async () => {
      try {
        const res = await window.api.executeJS(code);
        if (res.variables) setVariables(res.variables);
      } catch (_) {
        // silent fail — don't disrupt the UI
      } finally {
        setLiveEval(false);
      }
    }, 600);
    return () => { clearTimeout(timer); setLiveEval(false); };
  }, [code]);

  // Sync API Key to main process on load/change
  useEffect(() => {
    window.api.setApiKey(apiKey === 'local_mode' ? '' : apiKey);
  }, [apiKey]);

  const handleCodeChange = (val) => {
    setCode(val);
    if (activeTab) {
      setUnsaved(prev => new Set([...prev, activeTab]));
      setOpenFiles(prev => prev.map(f => f.path === activeTab ? { ...f, content: val } : f));
    }
  };

  const closeTab = (path) => {
    if (unsaved.has(path) && !window.confirm('Discard unsaved changes to this file?')) return;
    const idx = openFiles.findIndex(f => f.path === path);
    const newTabs = openFiles.filter(f => f.path !== path);
    setOpenFiles(newTabs);
    if (activeTab === path) {
      const newActive = newTabs[Math.max(0, idx - 1)]?.path ?? null;
      setActiveTab(newActive);
      if (newActive) setCode(newTabs.find(f => f.path === newActive)?.content ?? BOILERPLATE);
      else setCode(BOILERPLATE);
    }
    setUnsaved(prev => { const s = new Set(prev); s.delete(path); return s; });
  };

  const switchTab = (path) => {
    const tab = openFiles.find(f => f.path === path);
    if (tab) { setActiveTab(path); setCode(tab.content); }
  };

  const reportFileError = (action, result) => {
    if (result?.success) return false;
    setHasError(true);
    setOutput(`${action}: ${result?.error || 'Unknown file-system error.'}`);
    return true;
  };

  const normalizedPath = (value) => value.replace(/\\/g, '/');
  const isPathWithin = (candidate, parent) => {
    const child = normalizedPath(candidate);
    const base = normalizedPath(parent).replace(/\/$/, '');
    return child === base || child.startsWith(`${base}/`);
  };

  const remapPath = (candidate, oldPath, newPath) => {
    if (!isPathWithin(candidate, oldPath)) return candidate;
    return newPath + candidate.slice(oldPath.length);
  };

  // ─── Sidebar drag ─────────────────────────────────────────────────────
  const onSidebarDrag = useCallback((x) => {
    setSidebarWidth(Math.max(160, Math.min(400, x)));
  }, []);

  const onTerminalDrag = useCallback((y) => {
    const rect = mainRef.current?.getBoundingClientRect();
    const mainBottom = (rect?.top ?? 0) + (rect?.height ?? 600);
    setTerminalHeight(Math.max(100, Math.min(500, mainBottom - y)));
  }, []);

  const onRightDrag = useCallback((x) => {
    const total = window.innerWidth;
    setRightPanelWidth(Math.max(200, Math.min(480, total - x)));
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────
  if (!isApiKeySet) {
    return <LoginScreen onLoginSuccess={(key) => { setApiKey(key); setIsApiKeySet(true); }} />;
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', color: '#e6edf3',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #30363d; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* ─── Title Bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '40px', flexShrink: 0,
        background: '#161b22',
        borderBottom: '1px solid #21262d',
        WebkitAppRegion: 'drag',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', WebkitAppRegion: 'no-drag' }}>
          <BrandLogo size={32} />
          <span style={{
            fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px',
            background: 'linear-gradient(135deg, #e6edf3, #8b949e)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>JS NEXUS</span>
          <span style={{ color: '#3d444d', fontSize: '12px' }}>|</span>
          <span style={{ color: '#8b949e', fontSize: '11px' }}>
            {activeTab ? openFiles.find(f => f.path === activeTab)?.name : 'Untitled Script'}
          </span>
        </div>

        {/* Center: Workspace / Active File Path Breadcrumb */}
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontSize: '11px', color: '#8b949e', userSelect: 'none', gap: '6px',
        }}>
          <span>📂</span>
          <span style={{ fontWeight: 600, color: '#c9d1d9' }}>{rootName || 'No Workspace Open'}</span>
          {activeTab && (
            <>
              <span style={{ color: '#3d444d' }}>/</span>
              <span style={{ fontFamily: 'Fira Code, monospace', color: '#8b949e' }}>
                {openFiles.find(f => f.path === activeTab)?.name}
              </span>
            </>
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          {activeTab && (
            <button onClick={saveCurrentFile} title="Save (Ctrl+S)" style={{
              background: 'rgba(35,134,54,0.2)', border: '1px solid #238636',
              color: '#2ea043', borderRadius: '5px', padding: '3px 10px',
              fontSize: '11px', cursor: 'pointer', fontWeight: 600,
            }}>
              💾 Save
            </button>
          )}
          {isApiKeySet && (
            <button
              onClick={() => {
                localStorage.removeItem('ollama_api_key');
                window.api.setApiKey('');
                setApiKey('');
                setIsApiKeySet(false);
              }}
              title="Logout from Ollama Cloud"
              style={{
                background: 'rgba(255,107,107,0.12)', border: '1px solid #ff6b6b44',
                color: '#ff6b6b', borderRadius: '5px', padding: '3px 8px',
                fontSize: '11px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              🚪 Sign Out
            </button>
          )}
          <button
            onClick={() => setShowRightPanel(p => !p)}
            title="Toggle right panel"
            style={{
              background: showRightPanel ? 'rgba(88,166,255,0.15)' : '#21262d',
              border: `1px solid ${showRightPanel ? '#388bfd44' : '#30363d'}`,
              color: showRightPanel ? '#58a6ff' : '#6e7681',
              borderRadius: '5px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            {showRightPanel ? '⬛ Hide Panel' : '◨ Show Panel'}
          </button>
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── Icon sidebar ─────────────────────────────────────── */}
        <div style={{
          width: '44px', flexShrink: 0,
          backgroundColor: '#161b22', borderRight: '1px solid #21262d',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: '8px', gap: '2px',
        }}>
          {PANELS.map(p => {
            const isActive = activePanel === p.id && !isSidebarCollapsed;
            return (
              <button
                key={p.id}
                onClick={() => {
                  if (activePanel === p.id) {
                    setIsSidebarCollapsed(prev => !prev);
                  } else {
                    setActivePanel(p.id);
                    setIsSidebarCollapsed(false);
                  }
                }}
                title={p.label}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px', border: 'none',
                  background: isActive ? 'rgba(88,166,255,0.15)' : 'transparent',
                  color: isActive ? '#58a6ff' : '#6e7681',
                  fontSize: '16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 0 0 1px #388bfd44 inset' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#21262d'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {p.icon}
              </button>
            );
          })}
        </div>

        {/* ─── Left panel (file tree / memory / etc.) ───────────── */}
        <div style={{
          width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px`,
          flexShrink: 0,
          overflow: 'hidden',
          display: isSidebarCollapsed ? 'none' : 'block',
        }}>
          {activePanel === 'files' && (
            <FileExplorer
              tree={fileTree}
              rootName={rootName}
              rootPath={rootPath}
              selectedPath={selectedFile}
              onSelect={openFileInEditor}
              onOpenFolder={openFolder}
              onRefresh={refreshFolder}
              onCloseFolder={async () => {
                if (unsaved.size > 0 && !window.confirm('Close the workspace and discard all unsaved changes?')) return;
                await window.api.closeFolder();
                setRootPath(null);
                setFileTree(null);
                setRootName(null);
                setSelectedFile(null);
                setOpenFiles([]);
                setActiveTab(null);
                setCode(BOILERPLATE);
              }}
              onRename={async (oldPath, newPath) => {
                const result = await window.api.renameFile(oldPath, newPath);
                if (reportFileError('Unable to rename item', result)) return;
                setOpenFiles(prev => prev.map(file => ({
                  ...file,
                  path: remapPath(file.path, oldPath, newPath),
                  name: isPathWithin(file.path, oldPath)
                    ? remapPath(file.path, oldPath, newPath).split(/[/\\]/).pop()
                    : file.name,
                })));
                setUnsaved(prev => new Set([...prev].map(filePath => remapPath(filePath, oldPath, newPath))));
                setActiveTab(prev => prev ? remapPath(prev, oldPath, newPath) : prev);
                setSelectedFile(prev => prev ? remapPath(prev, oldPath, newPath) : prev);
                await refreshFolder();
              }}
              onDelete={async (itemPath) => {
                if (!window.confirm('Move this item to the Recycle Bin?')) return;
                const result = await window.api.deleteFile(itemPath);
                if (reportFileError('Unable to delete item', result)) return;
                const remainingFiles = openFiles.filter(file => !isPathWithin(file.path, itemPath));
                setOpenFiles(remainingFiles);
                setUnsaved(prev => new Set([...prev].filter(filePath => !isPathWithin(filePath, itemPath))));
                if (activeTab && isPathWithin(activeTab, itemPath)) {
                  const next = remainingFiles[0] || null;
                  setActiveTab(next?.path || null);
                  setCode(next?.content || BOILERPLATE);
                }
                if (selectedFile && isPathWithin(selectedFile, itemPath)) setSelectedFile(null);
                await refreshFolder();
              }}
              onNewFile={async (filePath) => {
                const result = await window.api.createFile(filePath);
                if (!reportFileError('Unable to create file', result)) await refreshFolder();
              }}
              onNewFolder={async (dirPath) => {
                const result = await window.api.createFolder(dirPath);
                if (!reportFileError('Unable to create folder', result)) await refreshFolder();
              }}
            />
          )}
          {activePanel === 'git' && <GitPanel rootPath={rootPath} />}
          {activePanel === 'ai' && <AiChat currentCode={code} />}
          {activePanel === 'memory' && <MemoryBox variables={variables} code={code} liveEval={liveEval} />}
          {activePanel === 'events' && <EventLoopVisualizer code={code} />}
          {activePanel === 'api' && <ApiTester />}
        </div>

        {!isSidebarCollapsed && <VerticalDivider onDrag={onSidebarDrag} />}

        {/* ─── Center: Editor + Terminal ────────────────────────── */}
        <div ref={mainRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              value={code}
              onChange={handleCodeChange}
              onRun={runCode}
              isRunning={isRunning}
              filename={activeTab ? openFiles.find(f => f.path === activeTab)?.name : 'Untitled.js'}
              execEngine={execEngine}
              setExecEngine={setExecEngine}
              openFiles={openFiles}
              activeTab={activeTab}
              switchTab={switchTab}
              closeTab={closeTab}
              unsaved={unsaved}
            />
          </div>

          <HorizontalDivider onDrag={onTerminalDrag} />

          {/* Terminal */}
          <div style={{ height: `${terminalHeight}px`, flexShrink: 0, overflow: 'hidden' }}>
            <Terminal
              ref={terminalRef}
              output={output}
              hasError={hasError}
              isRunning={isRunning}
              stats={stats}
              rootPath={rootPath}
            />
          </div>
        </div>

        {/* ─── Right panel: Memory when viewing API etc. ─────────── */}
        {showRightPanel && (
          <>
            <VerticalDivider onDrag={onRightDrag} />
            <div ref={rightRef} style={{ width: `${rightPanelWidth}px`, flexShrink: 0, overflow: 'hidden' }}>
              {/* Show memory by default in right, or event loop if active */}
              {activePanel !== 'memory' && activePanel !== 'events' ? (
                <MemoryBox variables={variables} code={code} liveEval={liveEval} />
              ) : (
                <div style={{
                  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#3d444d', flexDirection: 'column', gap: '8px',
                  backgroundColor: '#0d1117',
                }}>
                  <div style={{ fontSize: '28px', opacity: 0.3 }}>◨</div>
                  <div style={{ fontSize: '12px' }}>Panel visible in left sidebar</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Status Bar ──────────────────────────────────────────────── */}
      <div style={{
        height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', backgroundColor: '#0d1117', borderTop: '1px solid #21262d',
        flexShrink: 0, userSelect: 'none',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{
            color: '#c9d1d9', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#161b22', padding: '2px 8px', borderRadius: '4px', border: '1px solid #21262d',
            fontWeight: 600, letterSpacing: '0.5px'
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3fb950',
              display: 'inline-block', animation: 'pulse 2s infinite'
            }} />
            READY
          </span>
          {activeTab && (
            <span style={{ color: '#8b949e', fontSize: '11px', fontFamily: 'Fira Code, monospace', opacity: 0.8 }}>
              {openFiles.find(f => f.path === activeTab)?.path}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', color: '#8b949e', fontSize: '11px' }}>
          <span style={{
            color: '#58a6ff', background: 'rgba(88, 166, 255, 0.1)',
            padding: '1px 6px', borderRadius: '4px', fontSize: '10px',
            fontWeight: 600, border: '1px solid rgba(88, 166, 255, 0.2)'
          }}>
            {execEngine === 'node' ? '🟢 Node.js Engine' : '⚡ Sandbox VM'}
          </span>
          <span>UTF-8</span>
          {stats && (
            <span style={{ color: '#ffd93d', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⏱ {stats.executionMs}ms
            </span>
          )}
          <span style={{ color: '#21262d' }}>|</span>
          <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span><kbd style={{ background: '#161b22', padding: '1px 4px', borderRadius: '3px', color: '#c9d1d9', border: '1px solid #30363d', fontSize: '9px', fontFamily: 'sans-serif' }}>Ctrl+Enter</kbd> Run</span>
            <span><kbd style={{ background: '#161b22', padding: '1px 4px', borderRadius: '3px', color: '#c9d1d9', border: '1px solid #30363d', fontSize: '9px', fontFamily: 'sans-serif' }}>Ctrl+S</kbd> Save</span>
          </span>
        </div>
      </div>

      {/* ─── AI Error Widget (floating) ───────────────────────────────── */}
      {showAI && aiError && (
        <AIErrorWidget
          error={aiError}
          code={code}
          onApplyFix={(fixedCode) => {
            setCode(fixedCode);
            if (activeTab) {
              setOpenFiles(prev => prev.map(f => f.path === activeTab ? { ...f, content: fixedCode } : f));
              setUnsaved(prev => new Set([...prev, activeTab]));
            }
            setShowAI(false);
          }}
          onDismiss={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
