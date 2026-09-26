import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Terminal as Xterm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

function colorize(line) {
  if (!line && line !== 0) return null;
  const str = String(line);

  // Error lines
  if (/^(❌|Error:|TypeError:|ReferenceError:|SyntaxError:)/i.test(str)) {
    return { color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)', icon: '' };
  }
  if (/^⚠️/.test(str)) return { color: '#ffd93d', bg: 'rgba(255,217,61,0.06)', icon: '' };
  if (/^ℹ️/.test(str)) return { color: '#74c0fc', bg: 'rgba(116,192,252,0.06)', icon: '' };
  if (/^✅/.test(str)) return { color: '#69db7c', bg: 'rgba(105,219,124,0.06)', icon: '' };
  if (/^📊/.test(str)) return { color: '#da77f2', bg: 'rgba(218,119,242,0.06)', icon: '' };

  return { color: '#cdd9e5', bg: 'transparent', icon: '' };
}

function TokenizedLine({ text }) {
  const pattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\btrue\b|\bfalse\b|\bnull\b|\bundefined\b|\bNaN\b|\bInfinity\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|\[object \w+\]|[^\s"'`]+|\s+)/g;
  const tokens = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const tok = match[0];
    let color = 'inherit';
    if (/^(".*"|'.*'|`.*`)$/s.test(tok)) color = '#ff9e64';
    else if (/^(true|false)$/.test(tok)) color = '#7aa2f7';
    else if (/^(null|undefined)$/.test(tok)) color = '#787c99';
    else if (/^(NaN|Infinity)$/.test(tok)) color = '#bb9af7';
    else if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/.test(tok)) color = '#9ece6a';
    else if (/^\[object \w+\]$/.test(tok)) color = '#7dcfff';
    tokens.push({ tok, color });
  }

  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.tok}</span>
      ))}
    </span>
  );
}

const Terminal = forwardRef(function Terminal({ output, isRunning, stats, rootPath }, ref) {
  const bodyRef = useRef(null);
  const containerRef = useRef(null);
  const xtermRef = useRef(null);

  const [activeTab, setActiveTab] = useState('console');
  const [lines, setLines] = useState([]);

  useImperativeHandle(ref, () => ({
    clear: () => setLines([]),
    write: (text) => setLines(prev => [...prev, { text, ts: Date.now() }]),
  }));

  // Setup dynamic styles for xterm fallback to avoid style sheet layout breaking
  useEffect(() => {
    if (document.getElementById('xterm-style-fallback')) return;
    const style = document.createElement('style');
    style.id = 'xterm-style-fallback';
    style.innerHTML = `
      .xterm {
        font-family: 'Fira Code', monospace;
        cursor: text;
        position: relative;
        user-select: none;
        -ms-user-select: none;
        -webkit-user-select: none;
      }
      .xterm .xterm-screen {
        position: relative;
      }
      .xterm .xterm-helpers {
        position: absolute;
        top: 0;
        z-index: 5;
      }
      .xterm .xterm-helper-textarea {
        position: absolute;
        opacity: 0;
        left: -9999em;
        top: 0;
        width: 0;
        height: 0;
        z-index: -5;
        white-space: nowrap;
        overflow: hidden;
        resize: none;
      }
      .xterm .composition-view {
        background: #000;
        color: #FFF;
        display: none;
        position: absolute;
        white-space: nowrap;
        z-index: 1;
      }
      .xterm .composition-view.active {
        display: block;
      }
      .xterm .xterm-viewport {
        background-color: #0d1117;
        overflow-y: scroll;
        cursor: default;
        position: absolute;
        right: 0;
        left: 0;
        top: 0;
        bottom: 0;
      }
      .xterm .xterm-rows {
        position: absolute;
        left: 0;
        top: 0;
        background-color: #0d1117;
        color: #cdd9e5;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Update output logs for the Console tab
  useEffect(() => {
    if (!output) return;
    const newLines = output.split('\n').map(text => ({ text, ts: Date.now() }));
    setLines(newLines);
  }, [output]);

  // Auto-scroll Output Console
  useEffect(() => {
    if (activeTab === 'console' && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, activeTab]);

  // Setup Xterm shell instance
  useEffect(() => {
    if (activeTab !== 'shell' || !containerRef.current) return;

    const term = new Xterm({
      theme: {
        background: '#0d1117',
        foreground: '#cdd9e5',
        cursor: '#58a6ff',
        selectionBackground: 'rgba(56, 139, 253, 0.3)',
      },
      cursorBlink: true,
      fontFamily: "'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.2,
    });

    term.open(containerRef.current);
    xtermRef.current = term;

    // Connect renderer listener
    const unsubscribe = window.api.onTerminalData((data) => {
      term.write(data);
    });

    // Write terminal input to the backend
    term.onData((data) => {
      window.api.terminalWrite(data);
    });

    // Initialize native shell process
    window.api.terminalInit(rootPath);

    // Focus input
    term.focus();

    return () => {
      unsubscribe();
      term.dispose();
      xtermRef.current = null;
    };
  }, [activeTab, rootPath]);

  // Handle Resize of Shell
  useEffect(() => {
    if (!xtermRef.current || activeTab !== 'shell') return;
    
    const handleResize = () => {
      if (!containerRef.current || !xtermRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const cols = Math.max(10, Math.floor(width / 8.2) - 2);
      const rows = Math.max(5, Math.floor(height / 17.5) - 1);
      try {
        xtermRef.current.resize(cols, rows);
      } catch { /* terminal may be between layouts */ }
    };

    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', fontFamily: "'Fira Code', Consolas, monospace",
    }}>
      {/* Tab Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        flexShrink: 0, height: '36px',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', height: '100%', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('console')}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === 'console' ? '2px solid #58a6ff' : '2px solid transparent',
              color: activeTab === 'console' ? '#e6edf3' : '#8b949e',
              padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              height: '100%', textTransform: 'uppercase', letterSpacing: '0.5px',
              transition: 'all 0.15s',
            }}
          >
            📋 Output Console
          </button>
          
          <button
            onClick={() => setActiveTab('shell')}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === 'shell' ? '2px solid #58a6ff' : '2px solid transparent',
              color: activeTab === 'shell' ? '#e6edf3' : '#8b949e',
              padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              height: '100%', textTransform: 'uppercase', letterSpacing: '0.5px',
              transition: 'all 0.15s',
            }}
          >
            💻 Interactive Terminal {rootPath ? `(${rootPath.split(/[/\\]/).pop()})` : ''}
          </button>
        </div>

        {/* Right Info / Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {activeTab === 'console' && stats && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#58a6ff', fontSize: '11px' }}>
                ⏱ {stats.executionMs}ms
              </span>
              {stats.memoryUsedMB !== undefined && (
                <span style={{ color: '#8957e5', fontSize: '11px' }}>
                  🧠 {stats.memoryUsedMB >= 0 ? (stats.memoryUsedMB > 0 ? `+${stats.memoryUsedMB}` : '~0') : '?'} MB
                </span>
              )}
            </div>
          )}
          {activeTab === 'console' && (
            <button
              onClick={() => setLines([])}
              style={{
                background: 'none', border: '1px solid #30363d', color: '#6e7681',
                padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#58a6ff'; e.target.style.color = '#58a6ff'; }}
              onMouseLeave={e => { e.target.style.borderColor = '#30363d'; e.target.style.color = '#6e7681'; }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Output Console Tab Panel */}
        {activeTab === 'console' && (
          <div ref={bodyRef} style={{
            height: '100%', overflowY: 'auto', padding: '12px 16px',
            fontSize: '13px', lineHeight: '1.8',
            scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117',
          }}>
            {lines.length === 0 ? (
              <div style={{ color: '#3d444d', fontStyle: 'italic', marginTop: '8px' }}>
                // Run your code with Ctrl+Enter or the Run button
              </div>
            ) : (
              lines.map((line, i) => {
                const style = colorize(line.text);
                return (
                  <div key={i} style={{
                    display: 'flex', gap: '8px', marginBottom: '2px',
                    padding: '1px 6px', borderRadius: '4px',
                    backgroundColor: style?.bg || 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <span style={{ color: '#3d444d', userSelect: 'none', flexShrink: 0 }}>›</span>
                    <span style={{ color: style?.color || '#cdd9e5', wordBreak: 'break-all' }}>
                      <TokenizedLine text={line.text} />
                    </span>
                  </div>
                );
              })
            )}
            {isRunning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd93d', marginTop: '4px' }}>
                <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>●</span>
                <span>Executing...</span>
              </div>
            )}
          </div>
        )}

        {/* Interactive Shell Tab Panel */}
        <div
          ref={containerRef}
          style={{
            display: activeTab === 'shell' ? 'block' : 'none',
            height: '100%',
            backgroundColor: '#0d1117',
            padding: '8px',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
});

export default Terminal;
