import React, { useState, useCallback, useRef } from 'react';

function FileIcon({ name, isDir, isOpen }) {
  if (isDir) {
    if (name === 'node_modules') return <span style={{ fontSize: '14px', marginRight: '2px' }}>📦</span>;
    if (name === '.git') return <span style={{ fontSize: '14px', marginRight: '2px' }}>🌿</span>;
    return (
      <svg width="14.5" height="14.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
        <path d="M1.75 3A1.75 1.75 0 0 0 0 4.75v6.5C0 12.216.784 13 1.75 13h12.5A1.75 1.75 0 0 0 16 11.25V6.75A1.75 1.75 0 0 0 14.25 5H8.344L6.844 3.5h-5.09z" fill={isOpen ? "#e0a92d" : "#cfa338"} />
        <path d="M1.75 4.5A.25.25 0 0 0 1.5 4.75v6.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V6.75a.25.25 0 0 0-.25-.25H7.906L6.406 5H1.75z" fill={isOpen ? "#f2c75c" : "#e5ba4d"} />
      </svg>
    );
  }

  if (name.startsWith('.env')) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '15px', height: '15px', fontSize: '10px',
        backgroundColor: '#e3b341', color: '#0d1117',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
      }}>🔑</span>
    );
  }

  const ext = name.split('.').pop()?.toLowerCase();
  
  if (ext === 'js' || ext === 'cjs' || ext === 'mjs') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '9px',
        backgroundColor: '#f7df1e', color: '#000000',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>JS</span>
    );
  }

  if (ext === 'ts') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '9px',
        backgroundColor: '#3178c6', color: '#ffffff',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>TS</span>
    );
  }

  if (ext === 'jsx') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '9px',
        backgroundColor: '#61dafb', color: '#000000',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>JSX</span>
    );
  }

  if (ext === 'tsx') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '8px',
        backgroundColor: '#2b7489', color: '#ffffff',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>TSX</span>
    );
  }

  if (ext === 'json') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '9px',
        backgroundColor: '#cbcb41', color: '#0d1117',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>{'{}'}</span>
    );
  }

  if (ext === 'html') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '8px',
        backgroundColor: '#e34f26', color: '#ffffff',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>5</span>
    );
  }

  if (ext === 'css') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '8px',
        backgroundColor: '#1572b6', color: '#ffffff',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>#</span>
    );
  }

  if (ext === 'md') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', fontSize: '7px',
        backgroundColor: '#083fa6', color: '#ffffff',
        borderRadius: '3px', fontWeight: 800, marginRight: '4px',
        fontFamily: "'Inter', sans-serif",
      }}>MD</span>
    );
  }

  if (name.startsWith('.git')) {
    return <span style={{ fontSize: '13px', marginRight: '4px' }}>🌿</span>;
  }

  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v9.086A1.75 1.75 0 0 1 12.75 16h-9A1.75 1.75 0 0 1 2 14.25V1.75zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5H3.75zM9.5 1.586V4.25c0 .138.112.25.25.25h2.664L9.5 1.586z" fill="#8b949e" />
    </svg>
  );
}

// ─── Reusable Header/Icon Button with Hover state ───────────────────────────
function HeaderButton({ onClick, title, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(255, 255, 255, 0.08)' : 'none',
        border: 'none',
        color: hover ? '#e6edf3' : '#8b949e',
        cursor: 'pointer',
        padding: '4px 6px',
        fontSize: '12px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Inline Creation Input Row ──────────────────────────────────────────────
function CreationInputRow({ type, depth, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const submitted = useRef(false);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    if (name.trim()) onSubmit(name.trim());
    else onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      submitted.current = true;
      onCancel();
    }
  };

  const handleBlur = () => {
    submit();
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: `4px 8px 4px ${depth * 16 + 8}px`,
      borderRadius: '6px',
      backgroundColor: 'rgba(56, 139, 253, 0.05)',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Indentation Guides */}
      {Array.from({ length: depth }).map((_, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${idx * 16 + 10}px`,
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />
      ))}
      <span style={{ fontSize: '13px' }}>
        {type === 'folder' ? '📁' : '📄'}
      </span>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={type === 'folder' ? 'Folder name...' : 'File name...'}
        style={{
          background: '#0d1117',
          border: '1px solid #58a6ff',
          color: '#e6edf3',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          outline: 'none',
          width: '100%',
          fontFamily: 'Fira Code, monospace',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── FileNode (Recursive Component) ─────────────────────────────────────────
function FileNode({ node, depth, onSelect, selectedPath, onRename, onDelete, onNewFile, onNewFolder, createContext, setCreateContext }) {
  const [open, setOpen] = useState(depth < 2);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isSelected = selectedPath === node.path;
  const isCreatingHere = createContext && createContext.parentPath === node.path;
  const shouldShowChildren = open || isCreatingHere;

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleRenameSubmit = () => {
    if (newName && newName !== node.name) {
      const dir = node.path.replace(/[/\\][^/\\]+$/, '');
      const newPath = dir + '/' + newName;
      onRename?.(node.path, newPath);
    }
    setRenaming(false);
  };

  const startCreate = (type) => {
    setOpen(true);
    setCreateContext({ parentPath: node.path, type });
    setShowMenu(false);
  };

  const startCreateForFile = (type) => {
    const parentDir = node.path.replace(/[/\\][^/\\]+$/, '');
    setCreateContext({ parentPath: parentDir, type });
    setShowMenu(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 100,
            backgroundColor: '#1c2128', border: '1px solid #30363d',
            borderRadius: '8px', padding: '4px', minWidth: '160px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            {[
              node.isDir && { label: '📄 New File', action: () => startCreate('file') },
              node.isDir && { label: '📁 New Folder', action: () => startCreate('folder') },
              !node.isDir && { label: '📄 New File', action: () => startCreateForFile('file') },
              !node.isDir && { label: '📁 New Folder', action: () => startCreateForFile('folder') },
              { label: '✏️ Rename', action: () => { setRenaming(true); setNewName(node.name); setShowMenu(false); } },
              { label: '🗑️ Delete', action: () => { onDelete?.(node.path); setShowMenu(false); }, danger: true },
            ].filter(Boolean).map((item, i) => (
              <div key={i} onClick={item.action} style={{
                padding: '7px 12px', borderRadius: '6px', fontSize: '12px',
                color: item.danger ? '#ff6b6b' : '#cdd9e5',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}

      <div
        onClick={() => {
          if (node.isDir) setOpen(o => !o);
          else onSelect?.(node);
        }}
        onContextMenu={handleContextMenu}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: `5px 8px 5px ${depth * 16 + 8}px`,
          cursor: 'pointer',
          borderRadius: '6px',
          userSelect: 'none',
          backgroundColor: isSelected ? 'rgba(88,166,255,0.12)' : 'transparent',
          transition: 'all 0.15s',
          color: isSelected ? '#58a6ff' : '#cdd9e5',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(33,38,45,0.8)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Indentation Guides */}
        {Array.from({ length: depth }).map((_, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${idx * 16 + 10}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />
        ))}

        {node.isDir && (
          <span style={{ color: '#6e7681', fontSize: '10px', width: '10px', display: 'flex', alignItems: 'center' }}>
            {open ? '▾' : '▸'}
          </span>
        )}
        <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
          <FileIcon name={node.name} isDir={node.isDir} isOpen={open} />
        </span>
        
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid #58a6ff', color: '#e6edf3',
              borderRadius: '4px', padding: '1px 6px', fontSize: '12px', outline: 'none', width: '100%',
              fontFamily: 'Fira Code, monospace', boxSizing: 'border-box'
            }}
          />
        ) : (
          <span style={{
            fontSize: '13px', fontFamily: 'Fira Code, monospace',
            color: node.isDir ? '#e6edf3' : '#cdd9e5',
            fontWeight: node.isDir ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.name}
          </span>
        )}
      </div>

      {node.isDir && shouldShowChildren && (
        <div style={{ position: 'relative' }}>
          {createContext && createContext.parentPath === node.path && (
            <CreationInputRow
              type={createContext.type}
              depth={depth + 1}
              onSubmit={async (name) => {
                const fullPath = `${node.path}/${name}`;
                if (createContext.type === 'file') {
                  await onNewFile?.(fullPath);
                } else {
                  await onNewFolder?.(fullPath);
                }
                setCreateContext(null);
              }}
              onCancel={() => setCreateContext(null)}
            />
          )}
          {node.children?.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              onRename={onRename}
              onDelete={onDelete}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              createContext={createContext}
              setCreateContext={setCreateContext}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main FileExplorer ──────────────────────────────────────────────────────
export default function FileExplorer({ tree, rootName, rootPath, selectedPath, onSelect, onRename, onDelete, onNewFile, onNewFolder, onOpenFolder, onRefresh, onCloseFolder }) {
  const [filter, setFilter] = useState('');
  const [createContext, setCreateContext] = useState(null); // { parentPath: string, type: 'file' | 'folder' }

  const filterTree = useCallback((nodes, query) => {
    if (!query) return nodes;
    return nodes.reduce((acc, node) => {
      if (node.isDir) {
        const filtered = filterTree(node.children ?? [], query);
        if (filtered.length > 0) acc.push({ ...node, children: filtered });
      } else if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      }
      return acc;
    }, []);
  }, []);

  const displayTree = filter ? filterTree(tree ?? [], filter) : (tree ?? []);

  // Determine where to create new files/folders when using the global header buttons
  const triggerGlobalCreate = (type) => {
    if (!tree) return;
    let parentDir = rootPath;
    if (selectedPath) {
      parentDir = selectedPath.replace(/[/\\][^/\\]+$/, '');
    }
    setCreateContext({ parentPath: parentDir, type });
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#0d1117', borderRight: '1px solid #21262d',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Explorer
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {tree && (
              <>
                <HeaderButton onClick={() => triggerGlobalCreate('file')} title="New File...">
                  📄⁺
                </HeaderButton>
                <HeaderButton onClick={() => triggerGlobalCreate('folder')} title="New Folder...">
                  📁⁺
                </HeaderButton>
                <HeaderButton onClick={onRefresh} title="Refresh Explorer">
                  🔄
                </HeaderButton>
                <HeaderButton onClick={onCloseFolder} title="Close Workspace Folder">
                  ❌
                </HeaderButton>
              </>
            )}
            <button
              onClick={onOpenFolder}
              title="Open Workspace Folder"
              style={{
                background: 'rgba(31, 111, 235, 0.15)',
                border: '1px solid rgba(31, 111, 235, 0.4)',
                color: '#58a6ff', borderRadius: '5px',
                padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31, 111, 235, 0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(31, 111, 235, 0.15)'; }}
            >
              📂 Open
            </button>
          </div>
        </div>
        {tree && (
          <input
            placeholder="Filter files..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d',
              color: '#cdd9e5', borderRadius: '6px', padding: '5px 8px', fontSize: '12px',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#58a6ff'}
            onBlur={e => e.target.style.borderColor = '#30363d'}
          />
        )}
      </div>

      {/* Tree */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '6px 4px',
        scrollbarWidth: 'thin', scrollbarColor: '#21262d #0d1117',
      }}>
        {!tree ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#3d444d', gap: '10px', padding: '20px',
          }}>
            <div style={{ fontSize: '36px', opacity: 0.4 }}>📁</div>
            <div style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.6 }}>
              No folder open.<br />Click <strong style={{ color: '#58a6ff' }}>Open</strong> to get started.
            </div>
          </div>
        ) : (
          <>
            {rootName && (
              <div style={{
                padding: '4px 8px', color: '#8b949e', fontSize: '11px',
                fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                fontFamily: 'Fira Code, monospace', marginBottom: '4px',
              }}>
                {rootName}
              </div>
            )}
            {createContext && createContext.parentPath === rootPath && (
              <CreationInputRow
                type={createContext.type}
                depth={0}
                onSubmit={async (name) => {
                  const fullPath = `${rootPath}/${name}`;
                  if (createContext.type === 'file') {
                    await onNewFile?.(fullPath);
                  } else {
                    await onNewFolder?.(fullPath);
                  }
                  setCreateContext(null);
                }}
                onCancel={() => setCreateContext(null)}
              />
            )}
            {displayTree.map(node => (
              <FileNode
                key={node.path}
                node={node}
                depth={0}
                onSelect={onSelect}
                selectedPath={selectedPath}
                onRename={onRename}
                onDelete={onDelete}
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
                createContext={createContext}
                setCreateContext={setCreateContext}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
