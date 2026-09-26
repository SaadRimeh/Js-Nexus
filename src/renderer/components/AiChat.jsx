import React, { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Explain this code to me',
  'How do I reverse an array in JavaScript?',
  'What is the difference between let and const?',
  'Show me a Promise example',
  'How does event bubbling work?',
];

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '10px', marginBottom: '12px', alignItems: 'flex-start',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px',
        background: isUser
          ? 'linear-gradient(135deg, #1f6feb, #388bfd)'
          : 'linear-gradient(135deg, #8957e5, #a779f0)',
        boxShadow: isUser
          ? '0 2px 6px rgba(31,111,235,0.4)'
          : '0 2px 6px rgba(137,87,229,0.4)',
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '80%',
        padding: '10px 13px',
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(31,111,235,0.2), rgba(56,139,253,0.15))'
          : 'rgba(22,27,34,0.9)',
        border: `1px solid ${isUser ? '#388bfd33' : '#30363d'}`,
        boxShadow: isUser ? '0 2px 12px rgba(31,111,235,0.15)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {msg.loading ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#8957e5',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <pre style={{
            margin: 0, fontSize: '13px', lineHeight: '1.65',
            fontFamily: msg.isCode ? 'Fira Code, monospace' : "'Inter', sans-serif",
            color: isUser ? '#cdd9e5' : '#e6edf3',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {msg.content}
          </pre>
        )}
        <div style={{ marginTop: '4px', textAlign: isUser ? 'left' : 'right', color: '#6e7681', fontSize: '10px' }}>
          {msg.ts}
        </div>
      </div>
    </div>
  );
}

export default function AiChat({ currentCode }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your offline AI assistant powered by Ollama. Ask me anything about JavaScript, your code, or programming concepts.',
      ts: new Date().toLocaleTimeString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ollamaOk, setOllamaOk] = useState(null);
  const [models, setModels] = useState([]);
  const [installing, setInstalling] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkStatus = async () => {
    try {
      const res = await window.api.checkOllama();
      setOllamaOk(res.success);
      setModels(res.models || []);
    } catch {
      setOllamaOk(false);
      setModels([]);
    }
  };

  // Check if Ollama is running on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const handleStartService = async () => {
    setInstalling(true);
    setProgressMsg('Starting Ollama service...');
    const ok = await window.api.startOllama();
    if (ok) {
      await checkStatus();
      setProgressMsg('');
    } else {
      setProgressMsg('Could not auto-start. Please launch Ollama manually.');
    }
    setInstalling(false);
  };

  const handleDownloadModel = async () => {
    setInstalling(true);
    setProgressMsg('Connecting to Ollama registry...');
    setProgressPercent(0);

    const unsubscribe = window.api.onPullProgress((data) => {
      setProgressMsg(data.status || 'Downloading...');
      if (data.percentage !== undefined) {
        setProgressPercent(data.percentage);
      }
    });

    try {
      const res = await window.api.pullModel('codellama');
      if (res.success) {
        setProgressMsg('codellama downloaded successfully!');
        await checkStatus();
      } else {
        setProgressMsg(`Download failed: ${res.error || 'unknown error'}`);
      }
    } catch (e) {
      setProgressMsg('Download failed.');
    } finally {
      unsubscribe();
      setInstalling(false);
    }
  };

  const send = async (text) => {
    const userMsg = text ?? input.trim();
    if (!userMsg || loading) return;
    setInput('');
    setLoading(true);

    const userBubble = { role: 'user', content: userMsg, ts: new Date().toLocaleTimeString() };
    const loadingBubble = { role: 'assistant', content: '', loading: true, ts: '' };
    setMessages(prev => [...prev, userBubble, loadingBubble]);

    // Build prompt including current code context if relevant
    const prompt = currentCode
      ? `Context — current code in editor:\n\`\`\`javascript\n${currentCode.slice(0, 800)}\n\`\`\`\n\nUser question: ${userMsg}`
      : userMsg;

    try {
      const res = await window.api.aiChat(prompt);
      const response = res.response || '⚠️ No response from model.';
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: response,
          ts: new Date().toLocaleTimeString(),
          isCode: /```/.test(response),
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `⚠️ ${error?.message || 'Unable to reach the AI service.'}`,
          ts: new Date().toLocaleTimeString(),
          isCode: false,
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '6px', fontSize: '12px',
            background: 'linear-gradient(135deg, #8957e5, #a779f0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(137,87,229,0.4)',
          }}>🤖</div>
          <span style={{ color: '#6e7681', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            AI Assistant
          </span>
        </div>
        <div style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
          background: ollamaOk === null ? '#21262d' : ollamaOk ? 'rgba(105,219,124,0.15)' : 'rgba(255,107,107,0.12)',
          color: ollamaOk === null ? '#6e7681' : ollamaOk ? '#69db7c' : '#ff6b6b',
          border: `1px solid ${ollamaOk === null ? '#30363d' : ollamaOk ? '#69db7c44' : '#ff6b6b44'}`,
        }}>
          {ollamaOk === null ? '⏳ Checking…' : ollamaOk ? '🟢 Ollama Online' : '🔴 Ollama Offline'}
        </div>
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 12px',
        scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117',
      }}>
        {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}

        {/* Offline / Setup assistant view */}
        {ollamaOk === false && (
          <div style={{
            background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: '10px', padding: '14px', marginTop: '10px',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
              <span>⚠️</span> Local AI Service Offline
            </div>
            <div style={{ color: '#8b949e', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
              Ollama is not running. Click below to start it automatically.
            </div>
            <button
              onClick={handleStartService}
              disabled={installing}
              style={{
                width: '100%', padding: '8px', background: 'linear-gradient(135deg, #1f6feb, #388bfd)',
                border: 'none', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'opacity 0.2s',
              }}
            >
              {installing ? '⏳ Starting...' : '⚡ Auto-Start Ollama Service'}
            </button>
          </div>
        )}

        {ollamaOk === true && models.length === 0 && (
          <div style={{
            background: 'rgba(255,217,61,0.06)', border: '1px solid rgba(255,217,61,0.2)',
            borderRadius: '10px', padding: '14px', marginTop: '10px',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd93d', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
              <span>📥</span> No Models Downloaded
            </div>
            <div style={{ color: '#8b949e', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
              Ollama is active, but you don't have any models pulled yet. Download <b>codellama</b> (recommended) to enable offline assistance.
            </div>
            <button
              onClick={handleDownloadModel}
              disabled={installing}
              style={{
                width: '100%', padding: '8px', background: 'linear-gradient(135deg, #238636, #2ea043)',
                border: 'none', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'opacity 0.2s',
              }}
            >
              {installing ? '⏳ Downloading...' : '📥 Download codellama Model'}
            </button>
          </div>
        )}

        {/* Installing progress indicators */}
        {installing && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d' }}>
            <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{progressMsg}</span>
              {progressPercent > 0 && <span>{progressPercent}%</span>}
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#21262d', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#388bfd', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s)}
              style={{
                background: 'rgba(22,27,34,0.9)', border: '1px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '4px 10px',
                fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#8957e5'; e.currentTarget.style.color = '#cdd9e5'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e'; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #21262d',
        display: 'flex', gap: '8px', flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{
            flex: 1, backgroundColor: '#161b22', border: '1px solid #30363d',
            color: '#e6edf3', borderRadius: '8px', padding: '8px 10px',
            fontSize: '12px', outline: 'none', resize: 'none',
            fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#8957e5'}
          onBlur={e => e.target.style.borderColor = '#30363d'}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #8957e5, #a779f0)'
              : '#21262d',
            border: 'none', color: input.trim() ? '#fff' : '#6e7681',
            borderRadius: '8px', padding: '0 14px', fontSize: '14px',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            boxShadow: input.trim() ? '0 2px 8px rgba(137,87,229,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
