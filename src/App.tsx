import React from 'react';
import Editor from '@monaco-editor/react';

function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* منطقة العنوان والتحكم */}
      <div style={{ background: '#1e1e1e', padding: '10px', color: '#fff', textAlign: 'center' }}>
        JS Nexus - Professional Environment
      </div>

      {/* منطقة المحرر */}
      <Editor
        height="90vh"
        defaultLanguage="javascript"
        defaultValue="// ابدأ كتابة كود JS Nexus هنا..."
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: 'Fira Code',
          minimap: { enabled: true },
          smoothScrolling: true
        }}
      />
    </div>
  );
}

export default App;