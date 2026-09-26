import React, { useState, useEffect, useRef } from 'react';

export default function AIErrorWidget({ error, code, onApplyFix, onDismiss }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setAnalysis(null);

    if (!error) return;

    window.api.explainError(error, code)
      .then((res) => {
        if (mounted.current) setAnalysis(res);
      })
      .catch((requestError) => {
        if (mounted.current) {
          setAnalysis({
            success: false,
            cause: requestError?.message || 'The AI service could not analyze this error.',
            fix: null,
            hint: 'Check the Ollama connection and try again.',
          });
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, [error, code]);

  const handleApplyFix = () => {
    if (analysis?.fix) {
      setApplying(true);
      setTimeout(() => {
        onApplyFix?.(analysis.fix);
        setApplying(false);
      }, 300);
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
      width: '420px', maxWidth: 'calc(100vw - 48px)',
      backgroundColor: '#161b22',
      border: '1px solid #ff6b6b',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(255,107,107,0.25), 0 0 0 1px rgba(255,107,107,0.1)',
      overflow: 'hidden',
      animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,107,107,0.05))',
        borderBottom: '1px solid rgba(255,107,107,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', boxShadow: '0 2px 8px rgba(255,107,107,0.4)',
          }}>🤖</div>
          <div>
            <div style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '13px' }}>AI Error Interceptor</div>
            <div style={{ color: '#8b949e', fontSize: '11px' }}>Analyzing your error locally…</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer',
          fontSize: '18px', padding: '2px 6px', borderRadius: '4px',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.target.style.color = '#cdd9e5'}
          onMouseLeave={e => e.target.style.color = '#6e7681'}
        >✕</button>
      </div>

      {/* Error badge */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
          borderRadius: '8px', padding: '8px 12px',
          fontFamily: 'Fira Code, monospace', fontSize: '12px', color: '#ff9e9e',
          wordBreak: 'break-word',
        }}>
          {error}
        </div>
      </div>

      {/* Analysis body */}
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b949e' }}>
            <div style={{
              width: '16px', height: '16px', border: '2px solid #ff6b6b',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '13px' }}>Consulting local AI model…</span>
          </div>
        ) : analysis ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Cause */}
            <div>
              <div style={{ color: '#ffd93d', fontSize: '11px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                💡 Root Cause
              </div>
              <div style={{ color: '#cdd9e5', fontSize: '13px', lineHeight: 1.6 }}>
                {analysis.cause || 'Could not determine the cause.'}
              </div>
            </div>

            {analysis.hint && (
              <div style={{
                background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)',
                borderRadius: '6px', padding: '8px 12px',
              }}>
                <div style={{ color: '#58a6ff', fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>🔧 Tip</div>
                <div style={{ color: '#cdd9e5', fontSize: '12px' }}>{analysis.hint}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {analysis.fix && (
                <button
                  onClick={handleApplyFix}
                  disabled={applying}
                  style={{
                    flex: 1,
                    background: applying
                      ? 'rgba(46,160,67,0.3)'
                      : 'linear-gradient(135deg, #238636, #2ea043)',
                    border: 'none', color: '#fff',
                    padding: '9px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(46,160,67,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {applying ? '✅ Applying…' : '⚡ Apply Fix'}
                </button>
              )}
              <button
                onClick={onDismiss}
                style={{
                  background: 'rgba(33,38,45,0.8)', border: '1px solid #30363d',
                  color: '#8b949e', padding: '9px 16px', borderRadius: '8px',
                  fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#6e7681'; e.target.style.color = '#cdd9e5'; }}
                onMouseLeave={e => { e.target.style.borderColor = '#30363d'; e.target.style.color = '#8b949e'; }}
              >
                Dismiss
              </button>
            </div>

            {!analysis.success && (
              <div style={{ color: '#ffd93d', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
                ⚠️ Ollama not running — start it with <code style={{ background: '#21262d', borderRadius: '3px', padding: '1px 4px' }}>ollama run codellama</code>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
