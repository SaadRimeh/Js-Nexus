# JS Nexus Implementation Walkthrough ⚡

The JS Nexus JavaScript IDE project has been fully developed, structured, and wired up with all requested features. This document outlines the files configured, features implemented, and how to verify it locally.

---

## 📂 Implementation Details

The project files have been built and structured as follows:

| Component / File | Purpose | Key Details |
| :--- | :--- | :--- |
| **`electron/main.ts`** | Electron Main Process | Configured with a sandboxed Node `vm` context execution engine, file system helpers (`fs`), AI Ollama generation interface, HTTP Proxy for API testing, and full `simple-git` integration handlers. |
| **`electron/preload.ts`** | Security IPC Bridge | Securely exposes `window.api` functions for `fs`, `executeJS`, `aiChat`, `explainError`, `httpRequest`, and Git operations with `contextIsolation` enabled. |
| **`src/renderer/App.jsx`** | Assembled Interface | Implements the overall workspace layout: custom tabs, resizable sidebars, terminal heights, an icon utility navigation sidebar, and status bar. |
| **`Editor.jsx`** | Monaco Code Editor | Features bracket pair colorization, custom code snippets (e.g. `clog`, `fn`, `forof`), and automated execution via `Ctrl+Enter`. |
| **`Terminal.jsx`** | Output Terminal Console | Displays VM outputs with custom tokenizer coloring based on JavaScript types (`string`, `number`, `boolean`, `null`, `undefined`) along with execution benchmarks (timing & heap memory usage). |
| **`MemoryBox.jsx`** | Visual Variable Debugger | Extracts all variables evaluated in the sandboxed VM context, coloring and framing primitives, arrays, and objects with active memory glow effects. |
| **`EventLoopVisualizer.jsx`** | Event Loop Simulation | Provides a step-by-step visual animation demonstrating function state transitions between the Call Stack, Microtasks (Promises), and Macrotasks (`setTimeout`). |
| **`ApiTester.jsx`** | Built-in API Client | A complete lightweight HTTP requests runner (alternative to Postman) with full headers/body configurations, response codes, and request history tracking. |
| **`GitPanel.jsx`** | Source Control Client | Allows developers to inspect changes, view diffs, stage/unstage files, write commit messages, checkout branches, push, and pull. |
| **`AiChat.jsx`** | Local AI Copilot | Instantly queries Ollama models locally, feeding code contexts directly into chat interactions with a status dot indicator. |
| **`AIErrorWidget.jsx`** | Smart AI Debugger | Pops up automatically when a user's code execution fails, delivering the root cause and a single-click "Apply Fix" button to patch code in real time. |

---

## ⚡ Running the IDE locally

### 1. Enable Offline AI
Ensure **Ollama** is running on your machine:
```bash
# Verify it runs on http://127.0.0.1:11434
# Run the target model
ollama run codellama
```

### 2. Startup Server & App
```bash
# Installs packages
npm install

# Starts Vite development server & Electron UI
npm run dev
```

### 3. Packaging into `.exe` / `.dmg`
```bash
# Compiles React, then builds an Electron package via electron-builder
npm run dist
```
