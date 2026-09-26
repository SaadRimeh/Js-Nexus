import React, { useState } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS = {
  GET: '#69db7c', POST: '#ff9e64', PUT: '#7aa2f7', PATCH: '#da77f2',
  DELETE: '#ff6b6b', HEAD: '#ffd93d', OPTIONS: '#7dcfff',
};

function StatusBadge({ status }) {
  const color = status >= 500 ? '#ff6b6b' : status >= 400 ? '#ffd93d' : status >= 300 ? '#7dcfff' : status >= 200 ? '#69db7c' : '#8b949e';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 700,
      backgroundColor: `${color}22`, border: `1px solid ${color}66`, color,
    }}>
      {status}
    </span>
  );
}

export default function ApiTester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('body'); // body | headers | history
  const [history, setHistory] = useState([]);
  const [activeResTab, setActiveResTab] = useState('body'); // body | headers

  const send = async () => {
    if (loading) return;
    setLoading(true);
    setResponse(null);
    try {
      const parsedHeaders = headers.trim() ? JSON.parse(headers) : {};
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') {
        throw new Error('Headers must be a JSON object.');
      }
      const res = await window.api.httpRequest({
        url: url.trim(), method,
        headers: parsedHeaders,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      });
      setResponse(res);
      setHistory(h => [{ method, url: url.trim(), status: res.status, durationMs: res.durationMs, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    } catch (e) {
      setResponse({ success: false, error: e instanceof SyntaxError ? `Invalid headers JSON: ${e.message}` : e.message });
    } finally {
      setLoading(false);
    }
  };

  const formatBody = (raw) => {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', fontFamily: 'Fira Code, monospace',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>🔌</span>
          <span style={{ color: '#6e7681', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            API Tester
          </span>
        </div>
      </div>

      {/* URL bar */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={{
              backgroundColor: '#21262d', border: '1px solid #30363d',
              color: METHOD_COLORS[method] || '#cdd9e5',
              borderRadius: '6px', padding: '6px 8px', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer', outline: 'none',
              fontFamily: 'Fira Code, monospace',
            }}
          >
            {METHODS.map(m => (
              <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>{m}</option>
            ))}
          </select>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="https://api.example.com/endpoint"
            style={{
              flex: 1, backgroundColor: '#0d1117', border: '1px solid #30363d',
              color: '#e6edf3', borderRadius: '6px', padding: '6px 10px',
              fontSize: '12px', outline: 'none', fontFamily: 'Fira Code, monospace',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#58a6ff'}
            onBlur={e => e.target.style.borderColor = '#30363d'}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              background: loading ? '#21262d' : 'linear-gradient(135deg, #1f6feb, #388bfd)',
              border: 'none', color: '#fff', borderRadius: '6px',
              padding: '6px 14px', fontSize: '12px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(31,111,235,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳' : '▶ Send'}
          </button>
        </div>
      </div>

      {/* Request tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        {['body', 'headers', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 14px', background: 'none', border: 'none',
            color: tab === t ? '#58a6ff' : '#6e7681', fontSize: '12px',
            cursor: 'pointer', borderBottom: tab === t ? '2px solid #58a6ff' : '2px solid transparent',
            fontFamily: 'Fira Code, monospace', textTransform: 'capitalize', transition: 'color 0.2s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Request body area */}
      <div style={{ height: '120px', flexShrink: 0, borderBottom: '1px solid #21262d', overflow: 'hidden' }}>
        {tab === 'body' && (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            style={{
              width: '100%', height: '100%', backgroundColor: '#0d1117',
              color: '#cdd9e5', border: 'none', outline: 'none', resize: 'none',
              padding: '10px 12px', fontSize: '12px', fontFamily: 'Fira Code, monospace',
              boxSizing: 'border-box',
            }}
          />
        )}
        {tab === 'headers' && (
          <textarea
            value={headers}
            onChange={e => setHeaders(e.target.value)}
            style={{
              width: '100%', height: '100%', backgroundColor: '#0d1117',
              color: '#cdd9e5', border: 'none', outline: 'none', resize: 'none',
              padding: '10px 12px', fontSize: '12px', fontFamily: 'Fira Code, monospace',
              boxSizing: 'border-box',
            }}
          />
        )}
        {tab === 'history' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '6px' }}>
            {history.length === 0 ? (
              <div style={{ color: '#3d444d', fontSize: '12px', padding: '8px', textAlign: 'center' }}>No history yet</div>
            ) : history.map((h, i) => (
              <div
                key={i}
                onClick={() => { setMethod(h.method); setUrl(h.url); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: METHOD_COLORS[h.method], fontSize: '10px', fontWeight: 700, width: '45px' }}>{h.method}</span>
                <StatusBadge status={h.status} />
                <span style={{ color: '#8b949e', fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</span>
                <span style={{ color: '#3d444d', fontSize: '10px' }}>{h.ts}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {response && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 12px', backgroundColor: '#161b22',
              borderBottom: '1px solid #21262d', flexShrink: 0,
            }}>
              {response.status && <StatusBadge status={response.status} />}
              {response.durationMs && (
                <span style={{ color: '#58a6ff', fontSize: '11px' }}>⏱ {response.durationMs}ms</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex' }}>
                {['body', 'headers'].map(t => (
                  <button key={t} onClick={() => setActiveResTab(t)} style={{
                    padding: '3px 10px', background: 'none', border: 'none',
                    color: activeResTab === t ? '#58a6ff' : '#6e7681', fontSize: '11px',
                    cursor: 'pointer', borderBottom: activeResTab === t ? '2px solid #58a6ff' : '2px solid transparent',
                    fontFamily: 'Fira Code, monospace', textTransform: 'capitalize',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117' }}>
              {response.error ? (
                <div style={{ color: '#ff6b6b', fontSize: '12px' }}>❌ {response.error}</div>
              ) : activeResTab === 'body' ? (
                <pre style={{ color: '#cdd9e5', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {formatBody(response.body)}
                </pre>
              ) : (
                <div>
                  {Object.entries(response.headers || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#7aa2f7', fontSize: '12px', minWidth: '160px' }}>{k}:</span>
                      <span style={{ color: '#cdd9e5', fontSize: '12px' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {!response && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3d444d' }}>
            <div style={{ textAlign: 'center', gap: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '28px', opacity: 0.4 }}>🌐</div>
              <div style={{ fontSize: '12px' }}>Send a request to see the response</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
