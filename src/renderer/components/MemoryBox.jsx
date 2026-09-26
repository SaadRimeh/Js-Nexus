import React, { useMemo, useEffect, useRef, useState } from 'react';

// ─── Static parser (live as user types) ────────────────────────────────────
function parseDeclarations(code) {
  if (!code) return {};
  const lines = code.split('\n');
  const decls = {};
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const re = /(?:^|[;{}\n])\s*(let|var|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const [, kind, name] = m;
      if (!(name in decls)) decls[name] = { kind, line: lineNum, isLoop: false };
    }
    const loopRe = /for\s*\(\s*(let|var|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((m = loopRe.exec(line)) !== null) {
      const [, kind, name] = m;
      decls[name] = { kind, line: lineNum, isLoop: true };
    }
  });
  return decls;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getType(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function formatValue(val, type) {
  if (type === 'undefined') return 'undefined';
  if (type === 'null') return 'null';
  if (type === 'string') return `"${String(val).slice(0, 24)}"`;
  if (type === 'array') return `[${val.map(v => JSON.stringify(v)).join(', ').slice(0, 32)}]`;
  if (type === 'object') return `{${Object.entries(val).map(([k,v]) => `${k}:${JSON.stringify(v)}`).join(', ').slice(0, 32)}}`;
  if (type === 'function') return '[Function]';
  return String(val).slice(0, 30);
}

function formatShort(val) {
  if (val === null) return 'null';
  if (val === undefined) return '∅';
  if (typeof val === 'string') return `"${String(val).slice(0, 16)}"`;
  if (typeof val === 'object') {
    try { const s = JSON.stringify(val); return s.slice(0, 20) + (s.length > 20 ? '…' : ''); } catch { return '{…}'; }
  }
  return String(val).slice(0, 16);
}

const KIND_COLORS = {
  let:     { border: '#7aa2f7', bg: 'rgba(122,162,247,0.07)', badge: '#1e3a5f', badgeText: '#7aa2f7' },
  var:     { border: '#ff9e64', bg: 'rgba(255,158,100,0.07)', badge: '#5f2e1e', badgeText: '#ff9e64' },
  const:   { border: '#9ece6a', bg: 'rgba(158,206,106,0.07)', badge: '#1e3d0f', badgeText: '#9ece6a' },
  unknown: { border: '#565f89', bg: 'rgba(86,95,137,0.05)',   badge: '#2a2d40', badgeText: '#8b949e' },
};

const TYPE_COLORS = {
  number: '#9ece6a', string: '#ff9e64', boolean: '#7aa2f7',
  object: '#7dcfff', array: '#da77f2', function: '#ffd93d',
  null: '#787c99', undefined: '#3d444d',
};

// ─── Mini sparkline for numbers ─────────────────────────────────────────────
function Sparkline({ history }) {
  const nums = history.map(h => typeof h.value === 'number' ? h.value : null).filter(v => v !== null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const W = 80, H = 22;
  const pts = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="#7aa2f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {nums.map((v, i) => {
        const x = (i / (nums.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="2" fill="#7aa2f7" opacity={i === nums.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

// ─── History Row ─────────────────────────────────────────────────────────────
function HistoryRow({ item, idx, total, prevValue }) {
  const isCurrent = idx === total - 1;
  const val = formatShort(item.value);
  const type = getType(item.value);
  const color = TYPE_COLORS[type] || '#8b949e';

  // Numeric direction arrow
  let arrow = null;
  if (typeof item.value === 'number' && typeof prevValue === 'number') {
    if (item.value > prevValue) arrow = <span style={{ color: '#9ece6a', fontSize: '10px' }}>↑</span>;
    else if (item.value < prevValue) arrow = <span style={{ color: '#ff6b6b', fontSize: '10px' }}>↓</span>;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '3px 0',
      opacity: isCurrent ? 1 : Math.max(0.4, 0.5 + (idx / total) * 0.5),
      position: 'relative',
    }}>
      {/* Vertical connector line between dots */}
      {idx < total - 1 && (
        <div style={{
          position: 'absolute', left: '13px', top: '14px', height: '100%',
          width: '1px', background: '#21262d', zIndex: 0,
        }} />
      )}

      {/* Step dot */}
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
        background: isCurrent ? color : '#21262d',
        border: `2px solid ${isCurrent ? color : '#30363d'}`,
        zIndex: 1,
        boxShadow: isCurrent ? `0 0 8px ${color}88` : 'none',
        transition: 'all 0.3s',
      }} />

      {/* Line badge */}
      <span style={{
        fontSize: '9px', fontFamily: 'Fira Code, monospace',
        color: '#6e7681', background: '#161b22',
        border: '1px solid #21262d',
        borderRadius: '4px', padding: '1px 5px', flexShrink: 0,
        minWidth: '30px', textAlign: 'center',
      }}>
        L{item.line}
      </span>

      {/* Direction arrow for numbers */}
      {arrow && <span style={{ flexShrink: 0 }}>{arrow}</span>}

      {/* Value */}
      <span style={{
        fontFamily: 'Fira Code, monospace', fontSize: '12px',
        color: isCurrent ? color : '#8b949e',
        fontWeight: isCurrent ? 700 : 400,
        wordBreak: 'break-all', flex: 1,
      }}>
        {val}
      </span>

      {/* "now" label on current */}
      {isCurrent && (
        <span style={{
          fontSize: '8px', color: '#3fb950',
          background: 'rgba(63,185,80,0.1)',
          border: '1px solid rgba(63,185,80,0.25)',
          borderRadius: '4px', padding: '1px 5px', flexShrink: 0,
          letterSpacing: '0.4px',
        }}>
          now
        </span>
      )}
    </div>
  );
}

// ─── Variable Card ───────────────────────────────────────────────────────────
function VarCard({ name, entry, isNew, isChanged }) {
  const [expanded, setExpanded] = useState(true);
  const cardRef = useRef(null);

  const { kind = 'unknown', declaredLine, lastChangedLine, value, isLoop, history = [] } = entry;
  const kc = KIND_COLORS[kind] || KIND_COLORS.unknown;
  const type = getType(value);
  const typeColor = TYPE_COLORS[type] || '#8b949e';
  const formattedVal = formatValue(value, type);
  const hasValue = type !== 'undefined';
  const hasHistory = history.length > 0;
  const isNumericHistory = history.length > 1 && history.every(h => typeof h.value === 'number');

  // Animate on change
  useEffect(() => {
    if ((isNew || isChanged) && cardRef.current) {
      cardRef.current.style.animation = 'none';
      void cardRef.current.offsetWidth;
      cardRef.current.style.animation = isNew
        ? 'varSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards'
        : 'varPulse 0.6s ease forwards';
    }
  }, [isNew, isChanged, value]);

  // Auto-expand when we get history
  useEffect(() => {
    if (hasHistory) setExpanded(true);
  }, [hasHistory]);

  return (
    <div
      ref={cardRef}
      style={{
        border: `1px solid ${kc.border}`,
        borderRadius: '10px',
        backgroundColor: kc.bg,
        overflow: 'hidden',
        transition: 'box-shadow 0.3s',
        boxShadow: isChanged ? `0 0 16px ${kc.border}55` : `0 0 6px ${kc.border}18`,
      }}
    >
      {/* ── Header row ── */}
      <div
        onClick={() => hasHistory && setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '9px 12px',
          cursor: hasHistory ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* Loop badge */}
        {isLoop && (
          <span style={{
            fontSize: '9px', background: 'rgba(218,119,242,0.15)',
            border: '1px solid rgba(218,119,242,0.3)',
            borderRadius: '4px', padding: '1px 4px', color: '#da77f2', flexShrink: 0,
          }}>🔁</span>
        )}

        {/* Name */}
        <span style={{
          fontFamily: 'Fira Code, monospace', fontWeight: 700,
          fontSize: '13px', color: '#e6edf3', flex: 1,
        }}>
          {name}
        </span>

        {/* Current value inline */}
        <span style={{
          fontFamily: 'Fira Code, monospace', fontSize: '12px',
          color: hasValue ? typeColor : '#3d444d',
          fontStyle: hasValue ? 'normal' : 'italic',
          maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {hasValue ? formatShort(value) : 'not run'}
        </span>

        {/* Kind badge */}
        <span style={{
          background: kc.badge, color: kc.badgeText,
          borderRadius: '5px', fontSize: '9px', padding: '2px 6px',
          fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          border: `1px solid ${kc.border}44`, flexShrink: 0,
        }}>
          {kind}
        </span>

        {/* Expand toggle */}
        {hasHistory && (
          <span style={{ color: '#6e7681', fontSize: '10px', flexShrink: 0 }}>
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${kc.border}33` }}>

          {/* Current value block */}
          {hasValue && (
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${kc.border}22` }}>
              <div style={{ fontSize: '8px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>
                {isLoop && hasHistory ? 'last iteration' : type} · line {lastChangedLine || declaredLine}
              </div>
              <div style={{
                fontFamily: 'Fira Code, monospace', fontSize: '14px',
                color: typeColor, fontWeight: 700, wordBreak: 'break-all',
              }}>
                {formattedVal}
              </div>
            </div>
          )}

          {/* Sparkline for numeric history */}
          {isNumericHistory && (
            <div style={{ padding: '6px 12px 2px', borderBottom: `1px solid ${kc.border}22` }}>
              <div style={{ fontSize: '8px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                sparkline
              </div>
              <Sparkline history={history} />
            </div>
          )}

          {/* History timeline */}
          {hasHistory ? (
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: '8px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>change history</span>
                <span style={{ background: '#21262d', borderRadius: '8px', padding: '0 5px', color: '#8b949e' }}>
                  {history.length} step{history.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: '160px', overflowY: 'auto', paddingLeft: '4px' }}>
                {history.map((item, idx) => (
                  <HistoryRow
                    key={idx}
                    item={item}
                    idx={idx}
                    total={history.length}
                    prevValue={idx > 0 ? history[idx - 1].value : undefined}
                  />
                ))}
              </div>
            </div>
          ) : (
            !hasValue && (
              <div style={{ padding: '8px 12px', fontSize: '11px', color: '#3d444d', fontStyle: 'italic' }}>
                declared · not yet evaluated
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main MemoryBox Component ────────────────────────────────────────────────
export default function MemoryBox({ variables, code, liveEval }) {
  const staticDecls = useMemo(() => parseDeclarations(code || ''), [code]);

  const prevVarsRef = useRef({});
  const [changedKeys, setChangedKeys] = useState(new Set());
  const [newKeys, setNewKeys] = useState(new Set());

  // Merge static + runtime
  const merged = useMemo(() => {
    const result = {};
    for (const [name, info] of Object.entries(staticDecls)) {
      result[name] = { kind: info.kind, declaredLine: info.line, lastChangedLine: info.line, value: undefined, isLoop: info.isLoop, history: [] };
    }
    if (variables && typeof variables === 'object') {
      for (const [name, entry] of Object.entries(variables)) {
        if (typeof entry === 'object' && entry !== null && 'kind' in entry) {
          result[name] = {
            ...result[name], ...entry,
            isLoop: entry.isLoop || result[name]?.isLoop || false,
            history: entry.history || [],
          };
        } else {
          result[name] = { ...result[name], value: entry, kind: result[name]?.kind || 'unknown', history: [] };
        }
      }
    }
    return result;
  }, [staticDecls, variables]);

  // Detect adds / changes
  useEffect(() => {
    const prev = prevVarsRef.current;
    const changed = new Set();
    const added = new Set();
    for (const [name, entry] of Object.entries(merged)) {
      if (!prev[name]) { added.add(name); }
      else if (JSON.stringify(prev[name].value) !== JSON.stringify(entry.value) && entry.value !== undefined) {
        changed.add(name);
      }
    }
    setNewKeys(added);
    setChangedKeys(changed);
    prevVarsRef.current = merged;
    if (changed.size > 0 || added.size > 0) {
      const t = setTimeout(() => { setChangedKeys(new Set()); setNewKeys(new Set()); }, 1500);
      return () => clearTimeout(t);
    }
  }, [merged]);

  const byKind = useMemo(() => {
    const groups = { let: [], var: [], const: [], unknown: [] };
    for (const [name, entry] of Object.entries(merged)) {
      const k = entry.kind in groups ? entry.kind : 'unknown';
      groups[k].push([name, entry]);
    }
    return groups;
  }, [merged]);

  const totalCount = Object.keys(merged).length;
  const hasRunData = variables && Object.keys(variables).length > 0;
  const totalSteps = Object.values(merged).reduce((acc, e) => acc + (e.history?.length || 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117', overflow: 'hidden' }}>
      <style>{`
        @keyframes varSlideIn { from { opacity:0; transform:translateX(14px); } to { opacity:1; transform:translateX(0); } }
        @keyframes varPulse { 0% { box-shadow:0 0 0 0 rgba(122,162,247,0.5); } 70% { box-shadow:0 0 0 8px rgba(122,162,247,0); } 100% { box-shadow:0 0 0 0 rgba(122,162,247,0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: '8px 14px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px' }}>🧠</span>
        <span style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          Memory Box
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {liveEval ? (
            <span style={{
              background: 'rgba(255,217,61,0.12)', color: '#ffd93d',
              border: '1px solid rgba(255,217,61,0.25)',
              borderRadius: '8px', fontSize: '9px', padding: '2px 7px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffd93d', display: 'inline-block', animation: 'pulse 0.7s ease infinite' }} />
              EVAL…
            </span>
          ) : (
            <span style={{
              background: 'rgba(63,185,80,0.12)', color: '#3fb950',
              border: '1px solid rgba(63,185,80,0.25)',
              borderRadius: '8px', fontSize: '9px', padding: '2px 7px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3fb950', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
              LIVE
            </span>
          )}
          <span style={{ background: '#21262d', color: '#8957e5', borderRadius: '8px', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
            {totalCount} vars
          </span>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {hasRunData && totalSteps > 0 && (
        <div style={{
          padding: '5px 14px', borderBottom: '1px solid #21262d', flexShrink: 0,
          display: 'flex', gap: '14px', backgroundColor: '#0d1117',
        }}>
          <span style={{ fontSize: '10px', color: '#6e7681', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#ffd93d' }}>⚡</span>
            {totalSteps} total assignment{totalSteps !== 1 ? 's' : ''} tracked
          </span>
          {changedKeys.size > 0 && (
            <span style={{ fontSize: '10px', color: '#ff9e64', animation: 'fadeIn 0.2s ease' }}>
              🔥 {changedKeys.size} changed
            </span>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div style={{
        padding: '5px 14px', borderBottom: '1px solid #21262d',
        display: 'flex', gap: '12px', flexShrink: 0, backgroundColor: '#0d1117',
      }}>
        {[['let', '#7aa2f7'], ['var', '#ff9e64'], ['const', '#9ece6a'], ['🔁 loop', '#da77f2']].map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: c, opacity: 0.85 }} />
            <span style={{ fontSize: '9px', color: '#6e7681', fontFamily: 'Fira Code, monospace' }}>{k}</span>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {totalCount === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3d444d', gap: '10px' }}>
          <div style={{ fontSize: '34px', opacity: 0.3 }}>📦</div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#4d5566' }}>No variables detected</div>
          <div style={{ fontSize: '10px', color: '#2d333b', textAlign: 'center', padding: '0 20px', lineHeight: 1.6 }}>
            Declare a variable using{' '}
            <span style={{ fontFamily: 'Fira Code, monospace', color: '#7aa2f7' }}>let</span>,{' '}
            <span style={{ fontFamily: 'Fira Code, monospace', color: '#ff9e64' }}>var</span>, or{' '}
            <span style={{ fontFamily: 'Fira Code, monospace', color: '#9ece6a' }}>const</span>
          </div>
        </div>
      )}

      {/* ── Variable list ── */}
      {totalCount > 0 && (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '10px 8px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117',
        }}>
          {['let', 'var', 'const', 'unknown'].map(kind => {
            const group = byKind[kind];
            if (!group || group.length === 0) return null;
            const kc = KIND_COLORS[kind];
            return (
              <div key={kind}>
                <div style={{
                  fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px',
                  color: kc?.badgeText || '#6e7681',
                  marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{ flex: 1, height: '1px', background: `${kc?.border || '#333'}33` }} />
                  {kind}
                  <div style={{ flex: 1, height: '1px', background: `${kc?.border || '#333'}33` }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.map(([name, entry]) => (
                    <VarCard
                      key={name} name={name} entry={entry}
                      isNew={newKeys.has(name)} isChanged={changedKeys.has(name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        padding: '5px 14px', borderTop: '1px solid #21262d', flexShrink: 0, backgroundColor: '#161b22',
      }}>
        <span style={{ fontSize: '9px', color: '#3d444d' }}>
          ✏️ Live parse · ⚡ Auto-eval · 📜 Full history
        </span>
      </div>
    </div>
  );
}
