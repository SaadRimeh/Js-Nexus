import React, { useState, useEffect, useCallback } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  M: { color: '#ffd93d', label: 'Modified',  bg: 'rgba(255,217,61,0.1)'   },
  A: { color: '#69db7c', label: 'Added',     bg: 'rgba(105,219,124,0.1)'  },
  D: { color: '#ff6b6b', label: 'Deleted',   bg: 'rgba(255,107,107,0.1)'  },
  R: { color: '#7aa2f7', label: 'Renamed',   bg: 'rgba(122,162,247,0.1)'  },
  '?': { color: '#8b949e', label: 'Untracked', bg: 'rgba(139,148,158,0.08)' },
};

function StatusBadge({ code }) {
  const s = STATUS_COLORS[code] ?? STATUS_COLORS['?'];
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '1px 5px',
      borderRadius: '4px', backgroundColor: s.bg,
      color: s.color, fontFamily: 'Fira Code, monospace',
    }}>{s.label}</span>
  );
}

function FileRow({ file, staged, onStageToggle, onSelect, isActive }) {
  const code = file.working_dir !== ' ' ? file.working_dir : file.index;
  return (
    <div
      onClick={() => onSelect(file)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '5px 10px', cursor: 'pointer', borderRadius: '6px',
        backgroundColor: isActive ? 'rgba(88,166,255,0.1)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(33,38,45,0.8)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <input
        type="checkbox"
        checked={staged}
        onChange={e => { e.stopPropagation(); onStageToggle(file, e.target.checked); }}
        onClick={e => e.stopPropagation()}
        style={{ accentColor: '#388bfd', cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{
        flex: 1, fontSize: '12px', fontFamily: 'Fira Code, monospace',
        color: isActive ? '#58a6ff' : '#cdd9e5',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {file.path}
      </span>
      <StatusBadge code={code} />
    </div>
  );
}

function DiffLine({ line }) {
  const isAdd = line.startsWith('+') && !line.startsWith('+++');
  const isDel = line.startsWith('-') && !line.startsWith('---');
  const isHunk = line.startsWith('@');
  return (
    <div style={{
      padding: '0 12px', fontSize: '12px', fontFamily: 'Fira Code, monospace',
      lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      backgroundColor: isAdd ? 'rgba(105,219,124,0.1)' : isDel ? 'rgba(255,107,107,0.1)' : isHunk ? 'rgba(88,166,255,0.08)' : 'transparent',
      color: isAdd ? '#69db7c' : isDel ? '#ff6b6b' : isHunk ? '#58a6ff' : '#8b949e',
      borderLeft: `3px solid ${isAdd ? '#69db7c' : isDel ? '#ff6b6b' : isHunk ? '#388bfd' : 'transparent'}`,
    }}>
      {line}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function GitPanel({ rootPath }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [staged, setStaged] = useState(new Set());
  const [commitMsg, setCommitMsg] = useState('');
  const [diff, setDiff] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [log, setLog] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [activeTab, setActiveTab] = useState('changes'); // changes | log | branches
  const [newBranch, setNewBranch] = useState('');
  const [pushPullStatus, setPushPullStatus] = useState('');
  const [committing, setCommitting] = useState(false);

  // ─── Load git status ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!rootPath) return;
    setLoading(true);
    setError(null);
    try {
      const [s, l, b] = await Promise.all([
        window.api.gitStatus(rootPath),
        window.api.gitLog(rootPath),
        window.api.gitBranches(rootPath),
      ]);
      if (s.success) setStatus(s.files);
      else setError(s.error);
      if (l.success) setLog(l.commits);
      if (b.success) { setBranches(b.all); setCurrentBranch(b.current); }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [rootPath]);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── Stage toggle ────────────────────────────────────────────────────
  const handleStageToggle = async (file, shouldStage) => {
    const result = await window.api.gitStage(rootPath, file.path, shouldStage);
    if (result.success) {
      setStaged(prev => {
        const next = new Set(prev);
        shouldStage ? next.add(file.path) : next.delete(file.path);
        return next;
      });
    }
  };

  const stageAll = async () => {
    await window.api.gitStage(rootPath, '.', true);
    setStaged(new Set((status ?? []).map(f => f.path)));
  };

  // ─── Diff ────────────────────────────────────────────────────────────
  const handleSelectFile = async (file) => {
    setActiveFile(file.path);
    const result = await window.api.gitDiff(rootPath, file.path);
    if (result.success) setDiff(result.diff);
    else setDiff(result.error);
  };

  // ─── Commit ──────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    const result = await window.api.gitCommit(rootPath, commitMsg);
    if (result.success) {
      setCommitMsg('');
      setStaged(new Set());
      refresh();
    } else {
      setError(result.error);
    }
    setCommitting(false);
  };

  // ─── Push / Pull ─────────────────────────────────────────────────────
  const handlePush = async () => {
    setPushPullStatus('pushing...');
    const r = await window.api.gitPush(rootPath);
    setPushPullStatus(r.success ? '✅ Pushed!' : `❌ ${r.error}`);
    setTimeout(() => setPushPullStatus(''), 4000);
  };

  const handlePull = async () => {
    setPushPullStatus('pulling...');
    const r = await window.api.gitPull(rootPath);
    setPushPullStatus(r.success ? '✅ Pulled!' : `❌ ${r.error}`);
    setTimeout(() => setPushPullStatus(''), 4000);
    refresh();
  };

  // ─── Create branch ───────────────────────────────────────────────────
  const handleCreateBranch = async () => {
    if (!newBranch.trim()) return;
    const r = await window.api.gitCheckout(rootPath, newBranch, true);
    if (r.success) { setNewBranch(''); refresh(); }
    else setError(r.error);
  };

  // ─── UI ──────────────────────────────────────────────────────────────
  if (!rootPath) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117' }}>
        <PanelHeader onRefresh={refresh} loading={loading} />
        <EmptyState icon="📂" message="Open a folder to use Git." />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117' }}>
        <PanelHeader onRefresh={refresh} loading={loading} />
        <EmptyState icon="⚠️" message={error} color="#ffd93d" />
      </div>
    );
  }

  const unstaged = (status ?? []).filter(f => !staged.has(f.path));
  const stagedFiles = (status ?? []).filter(f => staged.has(f.path));

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', overflow: 'hidden',
    }}>
      <PanelHeader onRefresh={refresh} loading={loading} branch={currentBranch} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        {['changes', 'log', 'branches'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: '7px', background: 'none', border: 'none',
            color: activeTab === t ? '#58a6ff' : '#6e7681',
            fontSize: '11px', cursor: 'pointer', textTransform: 'capitalize',
            borderBottom: activeTab === t ? '2px solid #58a6ff' : '2px solid transparent',
            fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
          }}>
            {t === 'changes' ? `Changes ${status ? `(${status.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Changes Tab ─────────────────────────────────────────── */}
      {activeTab === 'changes' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Action bar */}
          <div style={{ display: 'flex', gap: '6px', padding: '8px 10px', flexShrink: 0, borderBottom: '1px solid #21262d' }}>
            <button onClick={stageAll} style={btnStyle('#1f6feb', '#388bfd')}>+ Stage All</button>
            <button onClick={handlePull} style={btnStyle('#21262d', '#30363d', '#cdd9e5')}>⬇ Pull</button>
            <button onClick={handlePush} style={btnStyle('#21262d', '#30363d', '#cdd9e5')}>⬆ Push</button>
          </div>
          {pushPullStatus && (
            <div style={{ padding: '4px 10px', fontSize: '11px', color: pushPullStatus.startsWith('✅') ? '#69db7c' : '#ff6b6b', flexShrink: 0 }}>
              {pushPullStatus}
            </div>
          )}

          {/* File list + diff */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Staged */}
            {stagedFiles.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <SectionLabel label={`Staged (${stagedFiles.length})`} color="#69db7c" />
                {stagedFiles.map(f => (
                  <FileRow key={f.path} file={f} staged onStageToggle={handleStageToggle} onSelect={handleSelectFile} isActive={activeFile === f.path} />
                ))}
              </div>
            )}
            {/* Unstaged */}
            {unstaged.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <SectionLabel label={`Changes (${unstaged.length})`} color="#ffd93d" />
                {unstaged.map(f => (
                  <FileRow key={f.path} file={f} staged={false} onStageToggle={handleStageToggle} onSelect={handleSelectFile} isActive={activeFile === f.path} />
                ))}
              </div>
            )}
            {status?.length === 0 && <EmptyState icon="✅" message="Working tree clean" color="#69db7c" />}

            {/* Diff viewer */}
            {diff && (
              <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #21262d', scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117' }}>
                <div style={{ padding: '6px 12px', backgroundColor: '#161b22', color: '#8b949e', fontSize: '11px', position: 'sticky', top: 0, zIndex: 1 }}>
                  📄 {activeFile}
                </div>
                {diff.split('\n').map((line, i) => <DiffLine key={i} line={line} />)}
              </div>
            )}
          </div>

          {/* Commit box */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid #21262d', flexShrink: 0 }}>
            <textarea
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="Commit message (e.g. feat: add login page)..."
              rows={2}
              style={{
                width: '100%', backgroundColor: '#161b22', border: '1px solid #30363d',
                color: '#e6edf3', borderRadius: '7px', padding: '7px 10px',
                fontSize: '12px', outline: 'none', resize: 'none', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box', marginBottom: '6px', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#58a6ff'}
              onBlur={e => e.target.style.borderColor = '#30363d'}
            />
            <button
              onClick={handleCommit}
              disabled={!commitMsg.trim() || committing}
              style={{
                width: '100%',
                background: commitMsg.trim() && !committing
                  ? 'linear-gradient(135deg, #238636, #2ea043)'
                  : '#21262d',
                border: 'none', color: commitMsg.trim() ? '#fff' : '#6e7681',
                padding: '8px', borderRadius: '7px', fontSize: '12px',
                fontWeight: 700, cursor: commitMsg.trim() ? 'pointer' : 'not-allowed',
                boxShadow: commitMsg.trim() ? '0 2px 8px rgba(46,160,67,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {committing ? '⏳ Committing…' : '✅ Commit'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Log Tab ─────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117' }}>
          {log.length === 0 ? (
            <EmptyState icon="📋" message="No commits yet" />
          ) : log.map((commit, i) => (
            <div key={commit.hash} style={{
              padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
              backgroundColor: '#161b22', border: '1px solid #21262d',
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  fontFamily: 'Fira Code, monospace', fontSize: '11px', color: '#388bfd',
                  backgroundColor: 'rgba(56,139,253,0.12)', padding: '1px 6px', borderRadius: '4px',
                }}>
                  {commit.hash?.slice(0, 7)}
                </span>
                {i === 0 && (
                  <span style={{ fontSize: '10px', color: '#69db7c', background: 'rgba(105,219,124,0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                    HEAD
                  </span>
                )}
                <span style={{ marginLeft: 'auto', color: '#6e7681', fontSize: '11px' }}>
                  {new Date(commit.date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ color: '#e6edf3', fontSize: '13px', marginBottom: '3px', lineHeight: 1.4 }}>
                {commit.message}
              </div>
              <div style={{ color: '#8b949e', fontSize: '11px' }}>
                {commit.author_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Branches Tab ────────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Create branch */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={newBranch}
                onChange={e => setNewBranch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                placeholder="New branch name..."
                style={{
                  flex: 1, backgroundColor: '#161b22', border: '1px solid #30363d',
                  color: '#e6edf3', borderRadius: '6px', padding: '5px 8px',
                  fontSize: '12px', outline: 'none', fontFamily: 'Fira Code, monospace',
                }}
                onFocus={e => e.target.style.borderColor = '#58a6ff'}
                onBlur={e => e.target.style.borderColor = '#30363d'}
              />
              <button onClick={handleCreateBranch} style={btnStyle('#1f6feb', '#388bfd')}>
                + Create
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px', scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117' }}>
            {branches.map(b => (
              <div
                key={b}
                onClick={async () => {
                  if (b !== currentBranch) {
                    const r = await window.api.gitCheckout(rootPath, b, false);
                    if (r.success) refresh();
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '7px', marginBottom: '3px', cursor: 'pointer',
                  backgroundColor: b === currentBranch ? 'rgba(88,166,255,0.12)' : 'transparent',
                  border: `1px solid ${b === currentBranch ? '#388bfd44' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (b !== currentBranch) e.currentTarget.style.background = '#21262d'; }}
                onMouseLeave={e => { if (b !== currentBranch) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '13px' }}>
                  {b === currentBranch ? '🟢' : '⚪'}
                </span>
                <span style={{ flex: 1, fontSize: '13px', fontFamily: 'Fira Code, monospace', color: b === currentBranch ? '#58a6ff' : '#cdd9e5' }}>
                  {b}
                </span>
                {b === currentBranch && (
                  <span style={{ fontSize: '10px', color: '#69db7c', background: 'rgba(105,219,124,0.12)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '6px 10px', backgroundColor: 'rgba(255,107,107,0.1)', borderTop: '1px solid rgba(255,107,107,0.2)', color: '#ff6b6b', fontSize: '11px', flexShrink: 0 }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────
function PanelHeader({ onRefresh, loading, branch }) {
  return (
    <div style={{
      padding: '6px 12px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>🌿</span>
        <span style={{ color: '#6e7681', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Source Control
        </span>
        {branch && (
          <span style={{
            background: 'rgba(56,139,253,0.12)', border: '1px solid #388bfd44',
            color: '#58a6ff', borderRadius: '4px', padding: '1px 7px', fontSize: '11px',
            fontFamily: 'Fira Code, monospace',
          }}>
            {branch}
          </span>
        )}
      </div>
      <button onClick={onRefresh} disabled={loading} style={{
        background: 'none', border: '1px solid #30363d', color: '#6e7681',
        borderRadius: '5px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.target.style.borderColor = '#58a6ff'; e.target.style.color = '#58a6ff'; }}
        onMouseLeave={e => { e.target.style.borderColor = '#30363d'; e.target.style.color = '#6e7681'; }}
      >
        {loading ? '⏳' : '↺'}
      </button>
    </div>
  );
}

function SectionLabel({ label, color }) {
  return (
    <div style={{ padding: '4px 10px 2px', color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
      {label}
    </div>
  );
}

function EmptyState({ icon, message, color = '#3d444d' }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color, gap: '8px', padding: '20px',
    }}>
      <div style={{ fontSize: '28px', opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}

function btnStyle(bg, bgHover, color = '#fff') {
  return {
    background: `linear-gradient(135deg, ${bg}, ${bgHover})`,
    border: 'none', color, borderRadius: '5px', padding: '4px 10px',
    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
    boxShadow: `0 2px 6px ${bg}55`,
  };
}
