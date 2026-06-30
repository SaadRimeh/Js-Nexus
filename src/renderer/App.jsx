import React, { useState } from 'react';
import Editor from '@monaco-editor/react';




function colorizeOutput(text) {
  if (!text) return [];

  return text.split('\n').map((line, i) => {
    if (line.startsWith('Error:') || line.includes('Error')) {
      return <div key={i} style={{ color: '#f14c4c' }}>{'> '}{line}</div>;
    }
    if (line.startsWith('Executing') || line.startsWith('Code Executed')) {
      return <div key={i} style={{ color: '#858585', fontStyle: 'italic' }}>{line}</div>;
    }
    const tokens = tokenize(line);
    return (
      <div key={i} style={{ marginBottom: '2px' }}>
        <span style={{ color: '#569cd6', userSelect: 'none' }}>{'> '}</span>
        {tokens.map((tok, j) => (
          <span key={j} style={{ color: tok.color }}>{tok.text}</span>
        ))}
      </div>
    );
  });
}

function tokenize(line) {
  const result = [];
  const pattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\btrue\b|\bfalse\b|\bnull\b|\bundefined\b|\bNaN\b|\bInfinity\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|\[object \w+\]|[^\s"'`]+|\s+)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    const tok = match[0];
    let color = '#d4d4d4';
    if (/^(".*"|'.*'|`.*`)$/.test(tok)) color = '#ce9178'; // strings → orange
    else if (/^(true|false)$/.test(tok)) color = '#569cd6'; // boolean → blue
    else if (/^(null|undefined)$/.test(tok)) color = '#808080'; // null → gray
    else if (/^(NaN|Infinity)$/.test(tok)) color = '#b5cea8'; // special → light green
    else if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/.test(tok)) color = '#b5cea8'; // numbers → light green
    else if (/^\[object \w+\]$/.test(tok)) color = '#9cdcfe'; // objects → light blue
    result.push({ text: tok, color });
  }
  return result;
}

function App() {
  const [code, setCode] = useState('// Welcome to JS Nexus\nconsole.log("Hello!", 42, true, null);');
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Executing...');
    setHasError(false);
    try {
      const res = await window.api.executeJS(code);
      setHasError(!res.success);
      setOutput(res.output);
    } catch (err) {
      setHasError(true);
      setOutput('Error: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', color: '#ccc', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#252526', borderBottom: '1px solid #333' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', letterSpacing: '2px' }}>
          JS NEXUS
        </div>
        <button
          onClick={runCode}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#444' : '#0e639c',
            color: '#fff',
            border: 'none',
            padding: '8px 24px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {isRunning ? '⏳ جاري...' : '▶ تشغيل'}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            fontSize: 16,
            fontFamily: "'Fira Code', Consolas, monospace",
            minimap: { enabled: false },
            padding: { top: 16 },
            smoothScrolling: true,
            cursorBlinking: 'smooth'
          }}
        />
      </div>

      <div style={{ height: '220px', backgroundColor: '#1e1e1e', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 24px 4px', color: '#858585', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: hasError ? '#f14c4c' : output ? '#4af626' : '#555', display: 'inline-block', transition: 'background-color 0.3s' }} />
          (Output)
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 24px', fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace", fontSize: '14px', lineHeight: '1.7' }}>
          {output === null
            ? <span style={{ color: '#3a3a3a', fontStyle: 'italic' }}></span>
            : colorizeOutput(output)
          }
        </div>
      </div>

    </div>
  );
}

export default App;