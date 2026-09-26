<div align="center">

<!-- Animated Banner -->
<img src="public/branding/logo-256.png" alt="JS Nexus Logo" width="130" />

<br/>

# ⚡ JS Nexus

<p>
  <strong>A professional, offline-first JavaScript IDE</strong><br/>
  <sub>Built with Electron · React · Monaco Editor · Ollama AI</sub>
</p>

<br/>

<!-- Badges Row 1 -->
[![Electron](https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Monaco](https://img.shields.io/badge/Monaco_Editor-0.57-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)](https://microsoft.github.io/monaco-editor/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

<!-- Badges Row 2 -->
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Ollama](https://img.shields.io/badge/Ollama-AI-FF6B35?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-8B5CF6?style=for-the-badge&logo=windows&logoColor=white)]()

<br/>

<!-- Navigation Pills -->
[📖 Overview](#-overview) &nbsp;·&nbsp;
[✨ Features](#-features) &nbsp;·&nbsp;
[🏗️ Architecture](#️-architecture) &nbsp;·&nbsp;
[🛠️ Installation](#️-installation) &nbsp;·&nbsp;
[🚀 Usage](#-usage) &nbsp;·&nbsp;
[🧰 Tech Stack](#-tech-stack) &nbsp;·&nbsp;
[🤝 Contributing](#-contributing)

<br/>

---

</div>

## 📖 Overview

**JS Nexus** is a **professional desktop IDE** engineered exclusively for JavaScript developers. It merges a VS Code–grade editor with a live variable inspector, an animated event loop visualizer, a built-in API client, full Git source control, an embedded terminal, and a **100% offline AI assistant** — all without a single cloud dependency.

> 🔐 **Privacy-first by design.** Every computation — code execution, AI inference, Git operations — runs locally. Nothing ever leaves your machine.

<br/>

```
 JS Nexus = Monaco Editor + VM Sandbox + Memory Box + Event Loop + Git + AI (Ollama) + API Tester
```

<br/>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🖊️ Professional Code Editor
- **Monaco Editor** — the exact engine powering VS Code
- Multi-tab management with unsaved-change indicators (`●`)
- Smart snippets: `clog`, `fn`, `forof`, `arr`, `prom`
- Bracket pair colorization & live IntelliSense
- `Ctrl+Enter` to run · `Ctrl+S` to save

</td>
<td width="50%">

### ⚡ Dual Execution Engine
| Mode | Description |
|------|-------------|
| **Node.js Engine** | Full I/O, native modules, real filesystem |
| **Sandbox VM** | `node:vm` isolated context, 5 s timeout |

Each mode exposes a different API surface, giving you full power or safe isolation with a single dropdown switch.

</td>
</tr>
<tr>
<td width="50%">

### 🧠 Memory Box *(Live Variable Inspector)*
The crown jewel of JS Nexus — updates **as you type**:
1. **Static analysis** — detects `let`/`var`/`const` instantly
2. **Debounced eval** — silent sandbox run every 600 ms
3. **Final capture** — post-run values with types & glow effects
4. Color-coded primitives, arrays, and objects

</td>
<td width="50%">

### 🔄 Event Loop Visualizer
Step-by-step animated walkthrough of JavaScript concurrency:
- **Call Stack** — function frame push/pop
- **Microtask Queue** — Promise resolution (high priority)
- **Macrotask Queue** — `setTimeout` / `setInterval`

Watch your async code execute frame-by-frame.

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI Error Interceptor
Automatic AI-powered debugging on every runtime error:
1. Captures error message, stack trace & source
2. Sends to local **Ollama** model (offline, zero telemetry)
3. Displays root cause + corrected code block
4. One-click **"Apply Fix"** patches the editor instantly

</td>
<td width="50%">

### 🔌 Built-in API Tester
A full Postman-style HTTP client embedded in the IDE:
- GET · POST · PUT · DELETE · PATCH
- Custom headers + JSON body editor
- Response viewer: status, latency, formatted body
- Runs via Electron IPC — no Express, no extra port

</td>
</tr>
<tr>
<td width="50%">

### 🌿 Git Integration
Full source control panel without leaving the IDE:
- Stage / unstage / commit changes
- Inline diff viewer per file
- Push, pull, branch checkout via `simple-git`

</td>
<td width="50%">

### 💻 Interactive Terminal
- **Xterm.js** embedded terminal in the workspace
- Runs shell commands in your open project directory
- Output coloring by JS type: `string`, `number`, `boolean`
- Execution benchmarks: timing + heap memory usage

</td>
</tr>
</table>

<br/>

---

## 🏗️ Architecture

JS Nexus follows Electron's **multi-process architecture** with strict context isolation for maximum security and stability.

### Process Diagram

```mermaid
graph TB
    subgraph MAIN["🖥️ Electron Main Process (Node.js)"]
        VM["🔒 node:vm\nSandbox Engine"]
        FS["📁 node:fs\nFile System"]
        OLLAMA["🤖 Ollama Client\nlocalhost:11434"]
        HTTP["🌐 HTTP Proxy\nAPI Tester Backend"]
        GIT["🌿 simple-git\nGit Operations"]
    end

    subgraph BRIDGE["🔐 Preload (contextBridge)"]
        API["window.api\n(contextIsolation: true)"]
    end

    subgraph RENDERER["⚛️ React Renderer Process (Vite)"]
        EDITOR["🖊️ Monaco Editor"]
        MEMBOX["🧠 Memory Box"]
        EVLOOP["🔄 Event Loop\nVisualizer"]
        APITESTER["🔌 API Tester"]
        GITPANEL["🌿 Git Panel"]
        TERMINAL["💻 Terminal\n(Xterm.js)"]
        AICHAT["🤖 AI Chat"]
        AIERR["⚡ AI Error\nWidget"]
    end

    VM & FS & OLLAMA & HTTP & GIT --> API
    API --> EDITOR & MEMBOX & EVLOOP & APITESTER & GITPANEL & TERMINAL & AICHAT & AIERR

    style MAIN fill:#1e293b,stroke:#3b82f6,color:#e2e8f0
    style BRIDGE fill:#312e81,stroke:#818cf8,color:#e2e8f0
    style RENDERER fill:#14532d,stroke:#4ade80,color:#e2e8f0
```

### Security Model

```mermaid
graph LR
    A["Renderer\n(React UI)"] -->|"window.api\n(allow-listed calls)"| B["contextBridge\nPreload"]
    B -->|"IPC invoke"| C["Main Process\n(Node.js)"]
    C -->|restricted to\nopened folder| D["File System"]
    C --> E["node:vm\nSandbox"]
    C --> F["Ollama\nlocalhost"]

    style A fill:#1d4ed8,stroke:#60a5fa,color:#fff
    style B fill:#6d28d9,stroke:#a78bfa,color:#fff
    style C fill:#065f46,stroke:#34d399,color:#fff
    style D fill:#78350f,stroke:#fbbf24,color:#fff
    style E fill:#7f1d1d,stroke:#f87171,color:#fff
    style F fill:#831843,stroke:#f472b6,color:#fff
```

| Security Property | Value |
|---|---|
| `nodeIntegration` | `false` |
| `contextIsolation` | `true` |
| `sandbox` (preload) | `true` |
| File access | Restricted to user-opened folder |
| External links | Allow-listed |
| File deletion | OS trash (reversible) |

### VM Variable Capture

The Memory Box appends **guarded capture expressions** after user code to extract final values without exposing Node.js internals:

```js
// ── Your code ─────────────────────────────────────────────────────
let score = 0;
score = 10;
score = score * 2;

const name = "JS Nexus";
var version = 1;

// ── Internally appended capture pass ──────────────────────────────
try { __capture__.score   = typeof score   === 'undefined' ? undefined : score;   } catch {}
try { __capture__.name    = typeof name    === 'undefined' ? undefined : name;    } catch {}
try { __capture__.version = typeof version === 'undefined' ? undefined : version; } catch {}
```

> ⚠️ `node:vm` is a **convenience boundary**, not a hostile-code sandbox. For adversarial input, pair it with an OS-level sandbox.

<br/>

---

## 🔄 Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Editor as Monaco Editor
    participant MemBox as Memory Box
    participant IPC as IPC Bridge
    participant VM as node:vm Sandbox
    participant AI as Ollama AI

    User->>Editor: Type code
    Editor->>MemBox: Static analysis (instant)
    Editor-->>MemBox: Debounced eval after 600ms

    User->>Editor: Ctrl+Enter (Run)
    Editor->>IPC: executeJS(code, mode)
    IPC->>VM: Run in sandbox
    VM-->>IPC: { output, variables, error }
    IPC-->>Editor: Result
    Editor-->>MemBox: Final variable values

    alt Runtime Error
        VM-->>IPC: Error + stack trace
        IPC-->>AI: explainError(code, error)
        AI-->>Editor: Root cause + fix suggestion
        Editor-->>User: AI Error Widget (Apply Fix)
    end
```

<br/>

---

## 🛠️ Installation

### Prerequisites

| Requirement | Version | Link |
|---|---|---|
| **Node.js** | v20.19+ | [nodejs.org](https://nodejs.org) |
| **Git** | Any | [git-scm.com](https://git-scm.com) |
| **Ollama** *(optional)* | Latest | [ollama.com](https://ollama.com) |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/SaadRimeh/Js-Nexus.git
cd Js-Nexus

# 2. Install all dependencies
npm install

# 3. Launch the IDE in development mode
npm run dev
```

The Electron window opens automatically with Vite hot-reload enabled.

### AI Setup *(Optional — Fully Offline)*

```bash
# Install Ollama from https://ollama.com, then pull a coding model:
ollama pull codellama      # Recommended for code tasks
# or
ollama pull llama3         # General purpose
# or
ollama pull deepseek-coder # Specialized code model
```

> 💡 JS Nexus can also **auto-download models from within the IDE** — no terminal needed after the initial Ollama install.

### Build for Distribution

```bash
# Compile TypeScript + bundle React, then package the installer
npm run dist
# Output: dist/ directory with .exe (Windows) / .dmg (macOS) / .AppImage (Linux)
```

<br/>

---

## 🚀 Usage

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Run current code |
| `Ctrl + S` | Save current file |
| `Ctrl + Z` | Undo last change |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + /` | Toggle line comment |
| `F11` | Toggle fullscreen |

### Memory Box Workflow

```mermaid
stateDiagram-v2
    [*] --> Typing: User opens editor
    Typing --> StaticAnalysis: Any keystroke
    StaticAnalysis --> VariableDetected: let / var / const found
    VariableDetected --> DebouncedEval: Wait 600ms (idle)
    DebouncedEval --> LiveValues: Silent sandbox run
    LiveValues --> Typing: User continues typing
    Typing --> RunCode: Ctrl+Enter
    RunCode --> FinalCapture: Sandbox executes
    FinalCapture --> [*]: Final values + output displayed
```

**Try this example:**

```js
let score = 0;
score = 10;
score = score * 2;

for (let i = 0; i < 5; i++) {
  score = score + i;
}

const name = "JS Nexus";
var version = 1;
```

Watch the **Memory Box** panel on the right update live as you type, showing `score → 30`, `name → "JS Nexus"`, `version → 1`.

### Execution Mode Switch

Use the **dropdown in the editor toolbar** to switch engines:

| Engine | Use Case |
|---|---|
| **Node.js Engine** | File I/O, native modules, npm packages, shell interop |
| **Sandbox VM** | Safe isolated execution, Memory Box live inspection |

<br/>

---

## 📁 Project Structure

```
js-nexus/
├── 📁 electron/
│   ├── main.ts                   # Main process: VM engine, FS, Ollama, HTTP proxy, Git IPC
│   ├── preload.ts                # contextBridge: exposes window.api to renderer
│   └── electron-env.d.ts        # Electron type declarations
│
├── 📁 src/
│   ├── 📁 main/                  # Electron entry types
│   ├── 📁 preload/               # Preload type declarations
│   └── 📁 renderer/
│       ├── App.jsx               # Root layout, tabs, sidebar, state management
│       ├── main.jsx              # React entry point
│       └── 📁 components/
│           ├── Editor.jsx        # Monaco Editor wrapper + snippets + shortcuts
│           ├── MemoryBox.jsx     # Live variable inspector (static + runtime)
│           ├── Terminal.jsx      # Xterm.js terminal + type-colored output
│           ├── EventLoopVisualizer.jsx  # Animated call stack / queue viewer
│           ├── FileExplorer.jsx  # File tree: create, rename, delete, open folder
│           ├── GitPanel.jsx      # Stage, diff, commit, push, pull, branch
│           ├── ApiTester.jsx     # HTTP client (GET/POST/PUT/DELETE/PATCH)
│           ├── AiChat.jsx        # Ollama chat with code context injection
│           ├── AIErrorWidget.jsx # Auto-triggered AI debugger + Apply Fix
│           └── BrandLogo.jsx     # App logo component
│
├── 📁 public/
│   └── 📁 branding/             # Logo assets (PNG 32px – 1024px, ICO, ICNS)
│
├── 📁 scripts/
│   ├── generate-icons.cjs       # Icon generation utility
│   └── smoke-electron.cjs       # Smoke test runner
│
├── 📁 docs/
│   └── branding.md              # Brand guidelines
│
├── electron-builder.json5        # Installer / packaging configuration
├── vite.config.ts                # Vite + Electron plugin configuration
├── tsconfig.json                 # TypeScript project config
└── package.json                  # Scripts, deps, entry point
```

<br/>

---

## 🧰 Tech Stack

```mermaid
graph LR
    subgraph Frontend["⚛️ Frontend"]
        R["React 18"]
        M["Monaco Editor 0.57"]
        X["Xterm.js 6"]
        V["Vite 8"]
    end

    subgraph Desktop["🖥️ Desktop Layer"]
        E["Electron 42"]
        EB["electron-builder 26"]
    end

    subgraph Backend["⚙️ Main Process"]
        SG["simple-git 3"]
        VM["node:vm"]
        FS["node:fs"]
    end

    subgraph AI["🤖 AI Layer"]
        OL["Ollama\n(local LLM)"]
    end

    Frontend --> Desktop
    Desktop --> Backend
    Backend --> AI

    style Frontend fill:#1e40af,stroke:#60a5fa,color:#fff
    style Desktop fill:#3730a3,stroke:#a78bfa,color:#fff
    style Backend fill:#065f46,stroke:#34d399,color:#fff
    style AI fill:#7c2d12,stroke:#fb923c,color:#fff
```

| Technology | Version | Role |
|---|---|---|
| [Electron](https://electronjs.org) | 42 | Desktop application framework |
| [React](https://reactjs.org) | 18 | UI rendering & state management |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 0.57 | VS Code editor engine |
| [Xterm.js](https://xtermjs.org) | 6 | Embedded terminal emulator |
| [Vite](https://vitejs.dev) | 8 | Bundler & hot-reload dev server |
| [TypeScript](https://typescriptlang.org) | 5 | Type-safe development |
| [simple-git](https://github.com/steveukx/git-js) | 3 | Git operations via IPC |
| [node:vm](https://nodejs.org/api/vm.html) | Built-in | Sandboxed JS execution context |
| [Ollama](https://ollama.com) | Latest | Offline local AI model runner |
| [electron-builder](https://electron.build) | 26 | Cross-platform packaging & installer |

<br/>

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Here's how to get started:

```mermaid
gitGraph
   commit id: "Fork repo"
   branch feature/your-feature
   checkout feature/your-feature
   commit id: "Make changes"
   commit id: "Add tests"
   checkout main
   merge feature/your-feature id: "Pull Request"
```

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request on GitHub

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org):

| Prefix | Use for |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring |
| `style:` | Formatting only |
| `chore:` | Build / tooling changes |

<br/>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License — free to use, modify, and distribute with attribution.
```

<br/>

---

<div align="center">

<img src="public/branding/logo-64.png" alt="JS Nexus" width="48"/>

<br/>

**Built with ❤️ by [Saad Rimeh](https://github.com/SaadRimeh)**

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/SaadRimeh/Js-Nexus?style=social)](https://github.com/SaadRimeh/Js-Nexus/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/SaadRimeh/Js-Nexus?style=social)](https://github.com/SaadRimeh/Js-Nexus/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/SaadRimeh/Js-Nexus?style=social)](https://github.com/SaadRimeh/Js-Nexus/issues)

<br/>

⭐ **If JS Nexus helped you — drop a star, it means a lot!** ⭐

</div>
