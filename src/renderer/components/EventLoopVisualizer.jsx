import React, { useState, useEffect, useRef } from 'react';

// Simulates call stack + task queue transitions for visual display
// In a real scenario, vm-engine would emit events. Here we parse common patterns.

function StackFrame({ frame, style }) {
  return (
    <div style={{
      padding: '8px 12px',
      margin: '3px 0',
      borderRadius: '8px',
      background: frame.type === 'promise'
        ? 'linear-gradient(135deg, rgba(138,43,226,0.3), rgba(88,86,214,0.2))'
        : frame.type === 'async'
          ? 'linear-gradient(135deg, rgba(255,149,0,0.25), rgba(255,107,107,0.1))'
          : 'linear-gradient(135deg, rgba(88,166,255,0.2), rgba(56,139,253,0.1))',
      border: `1px solid ${frame.type === 'promise' ? '#8957e5' : frame.type === 'async' ? '#ff9e64' : '#388bfd'}44`,
      color: '#e6edf3',
      fontSize: '12px',
      fontFamily: 'Fira Code, monospace',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      boxShadow: `0 2px 8px ${frame.type === 'promise' ? 'rgba(137,87,229,0.2)' : 'rgba(56,139,253,0.15)'}`,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>
          {frame.type === 'promise' ? '🟣' : frame.type === 'async' ? '🟠' : '🔵'}
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{frame.name}</div>
          {frame.detail && (
            <div style={{ color: '#8b949e', fontSize: '10px', marginTop: '2px' }}>{frame.detail}</div>
          )}
        </div>
        {frame.phase && (
          <span style={{
            marginLeft: 'auto', fontSize: '9px', padding: '1px 6px',
            borderRadius: '4px', background: '#21262d', color: '#6e7681',
          }}>
            {frame.phase}
          </span>
        )}
      </div>
    </div>
  );
}

function QueuePanel({ title, icon, items, color }) {
  return (
    <div style={{
      flex: 1, minWidth: '140px',
      background: '#0d1117',
      border: `1px solid ${color}33`,
      borderRadius: '10px',
      padding: '10px',
      minHeight: '80px',
    }}>
      <div style={{ color, fontSize: '11px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span>{icon}</span> {title}
      </div>
      {items.length === 0 ? (
        <div style={{ color: '#3d444d', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', paddingTop: '12px' }}>
          empty
        </div>
      ) : (
        items.map((item, i) => (
          <div key={i} style={{
            padding: '5px 8px', marginBottom: '4px', borderRadius: '6px',
            background: `${color}18`, border: `1px solid ${color}33`,
            color, fontSize: '11px', fontFamily: 'Fira Code, monospace',
            animation: 'fadeIn 0.3s ease',
          }}>
            {item}
          </div>
        ))
      )}
    </div>
  );
}

// Parse code to extract notable event-loop-relevant constructs
function analyzeCode(code) {
  const taskQueue = [];
  const microtaskQueue = [];
  const callStack = [];

  // Main execution frame
  callStack.push({ name: 'anonymous (global)', type: 'sync', phase: 'executing' });

  // Detect function declarations
  const fnMatches = code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>)/g);
  for (const m of fnMatches) {
    const name = m[1] || m[2];
    if (name) callStack.push({ name: `${name}()`, type: 'sync', phase: 'hoisted' });
  }

  // Detect setTimeout / setInterval
  const hasTimeout = /setTimeout|setInterval/.test(code);
  if (hasTimeout) taskQueue.push('setTimeout callback');

  // Detect Promise chains
  const hasPromise = /new Promise|Promise\./.test(code);
  if (hasPromise) {
    microtaskQueue.push('Promise resolve');
    callStack.push({ name: 'Promise executor', type: 'promise', detail: 'Runs synchronously', phase: 'microtask' });
  }

  // Detect .then / .catch
  const hasThen = /\.then\(|\.catch\(|\.finally\(/.test(code);
  if (hasThen) microtaskQueue.push('.then() handler');

  // Detect async/await
  const hasAsync = /async\s+function|async\s*\(|await\s/.test(code);
  if (hasAsync) {
    callStack.push({ name: 'async function', type: 'async', detail: 'Suspends at await', phase: 'async' });
    microtaskQueue.push('await continuation');
  }

  return { callStack, taskQueue, microtaskQueue };
}

export default function EventLoopVisualizer({ code }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const intervalRef = useRef(null);

  const analysis = analyzeCode(code || '');
  const maxSteps = analysis.callStack.length + analysis.microtaskQueue.length + analysis.taskQueue.length;

  const visibleCallStack = analysis.callStack.slice(0, Math.min(step + 1, analysis.callStack.length));
  const visibleMicro = step >= analysis.callStack.length
    ? analysis.microtaskQueue.slice(0, step - analysis.callStack.length + 1)
    : [];
  const visibleTask = step >= analysis.callStack.length + analysis.microtaskQueue.length
    ? analysis.taskQueue
    : [];

  useEffect(() => {
    if (auto) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= maxSteps - 1) { setAuto(false); return s; }
          return s + 1;
        });
      }, 900);
    }
    return () => clearInterval(intervalRef.current);
  }, [auto, maxSteps]);

  const reset = () => { setStep(0); setAuto(false); };

  const stageLabel =
    step < analysis.callStack.length ? '⚡ Call Stack executing...'
      : step < analysis.callStack.length + analysis.microtaskQueue.length ? '🟣 Draining microtask queue...'
        : '📋 Processing macrotask queue...';

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 14px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🔄</span>
          <span style={{ color: '#6e7681', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Event Loop Visualizer
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={reset} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
            ↺ Reset
          </button>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ background: '#21262d', border: '1px solid #30363d', color: step === 0 ? '#3d444d' : '#cdd9e5', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', cursor: step === 0 ? 'not-allowed' : 'pointer' }}
          >◀</button>
          <button
            onClick={() => setStep(s => Math.min(maxSteps - 1, s + 1))}
            disabled={step >= maxSteps - 1}
            style={{ background: '#21262d', border: '1px solid #30363d', color: step >= maxSteps - 1 ? '#3d444d' : '#cdd9e5', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', cursor: step >= maxSteps - 1 ? 'not-allowed' : 'pointer' }}
          >▶</button>
          <button
            onClick={() => setAuto(a => !a)}
            style={{
              background: auto ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #238636, #2ea043)',
              border: 'none', color: '#fff', borderRadius: '5px', padding: '3px 10px',
              fontSize: '11px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            {auto ? '⏸ Pause' : '▶ Auto'}
          </button>
        </div>
      </div>

      {/* Stage indicator */}
      <div style={{
        padding: '6px 14px', backgroundColor: '#0d1117', borderBottom: '1px solid #21262d',
        color: '#8b949e', fontSize: '12px', fontStyle: 'italic', flexShrink: 0,
      }}>
        Step {step + 1}/{maxSteps} — {stageLabel}
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: '#21262d', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${((step + 1) / maxSteps) * 100}%`,
          background: 'linear-gradient(90deg, #1f6feb, #388bfd)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Main visualization grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117' }}>

        {/* Call Stack */}
        <div style={{ background: '#161b22', border: '1px solid #388bfd33', borderRadius: '10px', padding: '10px' }}>
          <div style={{ color: '#388bfd', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
            📚 Call Stack
          </div>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px', minHeight: '60px' }}>
            {visibleCallStack.length === 0 ? (
              <div style={{ color: '#3d444d', fontSize: '11px', textAlign: 'center', padding: '12px', fontStyle: 'italic' }}>empty — returned</div>
            ) : (
              visibleCallStack.map((f, i) => <StackFrame key={i} frame={f} />)
            )}
          </div>
        </div>

        {/* Queues */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <QueuePanel
            title="Microtask Queue"
            icon="🟣"
            items={visibleMicro}
            color="#8957e5"
          />
          <QueuePanel
            title="Task Queue"
            icon="📋"
            items={visibleTask}
            color="#ff9e64"
          />
        </div>

        {/* Event loop arrow legend */}
        <div style={{
          background: '#161b22', border: '1px solid #21262d', borderRadius: '10px',
          padding: '10px 12px', fontSize: '11px', color: '#6e7681',
          display: 'flex', gap: '16px', flexWrap: 'wrap',
        }}>
          <span>🔵 Sync function</span>
          <span>🟣 Promise / microtask</span>
          <span>🟠 Async/await</span>
          <span>📋 Macrotask (setTimeout)</span>
          <span style={{ color: '#444d56' }}>Priority: Sync → Microtasks → Macrotasks</span>
        </div>
      </div>
    </div>
  );
}
