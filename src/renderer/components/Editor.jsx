import React, { useRef } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TypeScriptWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco });

const BOILERPLATE = `// Welcome to JS Nexus ⚡
// A professional JavaScript IDE — fully offline

const greet = (name) => \`Hello, \${name}!\`;
console.log(greet("World"));

// Try arrays & objects
const scores = [95, 87, 72, 100];
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
console.log("Average score:", avg);
`;

export default function Editor({ value, onChange, onRun, isRunning, filename, execEngine, setExecEngine, openFiles, activeTab, switchTab, closeTab, unsaved }) {
  const editorRef = useRef(null);

  const getLanguageFromFileName = (name) => {
    if (!name) return 'javascript';
    if (name === '.env' || name.startsWith('.env.')) return 'ini';
    if (name.startsWith('.')) return 'plaintext';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'cjs':
      case 'mjs':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'txt':
      default:
        return 'plaintext';
    }
  };

  const language = getLanguageFromFileName(filename);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register keyboard shortcut: Ctrl+Enter to run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.();
    });

    // Custom JS auto-complete snippets
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: 'clog',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'console.log(${1:value});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'console.log snippet',
          },
          {
            label: 'fn',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'const ${1:name} = (${2:params}) => {\n\t${3:// body}\n};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arrow function snippet',
          },
          {
            label: 'forof',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (const ${1:item} of ${2:array}) {\n\t${3}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'for...of loop',
          },
        ],
      }),
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Editor header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px 0 0', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        flexShrink: 0, height: '36px',
      }}>
        {/* Left side: Tab Bar */}
        <div style={{
          display: 'flex', alignItems: 'stretch', height: '100%',
          overflowX: 'auto', flex: 1, marginRight: '16px',
          scrollbarWidth: 'none',
        }}>
          {openFiles && openFiles.map(tab => {
            const isActive = activeTab === tab.path;
            return (
              <div
                key={tab.path}
                onClick={() => switchTab(tab.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '0 14px',
                  background: isActive ? '#0d1117' : 'transparent',
                  borderRight: '1px solid #21262d',
                  borderTop: `2.5px solid ${isActive ? '#58a6ff' : 'transparent'}`,
                  color: isActive ? '#e6edf3' : '#8b949e',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  fontSize: '11px',
                  height: '100%',
                  position: 'relative',
                  marginTop: '-1px',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {unsaved && unsaved.has(tab.path) ? (
                    <span style={{ color: '#ffd93d', display: 'inline-block', fontSize: '8px' }}>●</span>
                  ) : null}
                  {tab.name}
                </span>
                <span
                  onClick={e => { e.stopPropagation(); closeTab(tab.path); }}
                  style={{
                    color: '#6e7681', fontSize: '10px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '12px', height: '12px', borderRadius: '50%',
                    marginLeft: '4px',
                  }}
                  onMouseEnter={e => {
                    e.target.style.color = '#e6edf3';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.color = '#6e7681';
                    e.target.style.background = 'transparent';
                  }}
                >✕</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={execEngine}
            onChange={(e) => setExecEngine?.(e.target.value)}
            style={{
              backgroundColor: '#0d1117', border: '1px solid #30363d',
              color: '#cdd9e5', borderRadius: '6px', padding: '4px 28px 4px 10px',
              fontSize: '11px', outline: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.2s',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' fill='%238b949e'><path d='M0 2h8L4 6z'/></svg>")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
            onFocus={(e) => e.target.style.borderColor = '#58a6ff'}
            onBlur={(e) => e.target.style.borderColor = '#30363d'}
          >
            <option value="node">🟢 Node.js</option>
            <option value="sandbox">⚡ Sandbox VM</option>
          </select>
          <span style={{ color: '#8b949e', fontSize: '11px', opacity: 0.8, userSelect: 'none' }}>Ctrl+Enter to Run</span>
          <button
            onClick={onRun}
            disabled={isRunning}
            id="run-button"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isRunning
                ? '#21262d'
                : 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
              border: '1px solid #30363d',
              color: '#fff', padding: '4px 12px',
              borderRadius: '6px', fontSize: '11px', fontWeight: '600',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease', letterSpacing: '0.3px',
              boxShadow: isRunning ? 'none' : '0 2px 10px rgba(46,160,67,0.25)',
            }}
            onMouseEnter={e => {
              if (!isRunning) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(46,160,67,0.4)';
              }
            }}
            onMouseLeave={e => {
              if (!isRunning) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(46,160,67,0.25)';
              }
            }}
          >
            {isRunning ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Running...</>
            ) : (
              <><span>▶</span> Run</>
            )}
          </button>
        </div>
      </div>

      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={value ?? BOILERPLATE}
        onChange={(v) => onChange?.(v || '')}
        onMount={handleMount}
        options={{
          fontSize: 15,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1, renderCharacters: false },
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: 'expand',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'gutter',
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          overviewRulerLanes: 0,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          tabSize: 2,
          wordWrap: 'off',
          suggest: { preview: true },
        }}
      />
    </div>
  );
}
