import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import vm from 'node:vm'
import { serialize, deserialize } from 'node:v8'
import { inspect } from 'node:util'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { performance } from 'node:perf_hooks'
import { simpleGit } from 'simple-git'
import { spawn, execFile } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// ─── VM Execution Engine ───────────────────────────────────────────────────
interface ExecResult {
  success: boolean
  output: string
  errorRaw?: string
  errorName?: string
  memoryUsedMB?: number
  executionMs?: number
  variables?: Record<string, unknown>
}

function runUserCode(code: string): ExecResult {
  if (typeof code !== 'string') return { success: false, output: 'TypeError: Code must be a string.', errorRaw: 'Code must be a string.', errorName: 'TypeError' }
  if (Buffer.byteLength(code, 'utf8') > 1024 * 1024) return { success: false, output: 'Code exceeds the 1 MB execution limit.', errorRaw: 'Code exceeds the 1 MB execution limit.' }
  const stringify = (val: unknown): string => {
    if (val === null) return 'null'
    if (val === undefined) return 'undefined'
    if (typeof val === 'object') {
      try { return JSON.stringify(val, null, 2) } catch { return String(val) }
    }
    return String(val)
  }

  const outputLogs: string[] = []
  const capturedVars: Record<string, unknown> = {}

  const customConsole = {
    log: (...args: unknown[]) => outputLogs.push(args.map(stringify).join(' ')),
    error: (...args: unknown[]) => outputLogs.push('❌ ' + args.map(stringify).join(' ')),
    warn: (...args: unknown[]) => outputLogs.push('⚠️  ' + args.map(stringify).join(' ')),
    info: (...args: unknown[]) => outputLogs.push('ℹ️  ' + args.map(stringify).join(' ')),
    table: (data: unknown) => outputLogs.push('📊 ' + stringify(data)),
  }

  const sandbox: Record<string, unknown> = {
    console: customConsole,
    setTimeout: () => {},
    clearTimeout: () => {},
    Math,
    JSON,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise: undefined, // async not supported in sync vm
    __capture__: capturedVars,
  }

  vm.createContext(sandbox)

  const memBefore = process.memoryUsage().heapUsed
  const t0 = performance.now()

  try {
    const declaredNames = [...code.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)]
      .map(match => match[1])
      .filter((name, index, names) => names.indexOf(name) === index)
    const captureStatements = declaredNames
      .map(name => `try { __capture__[${JSON.stringify(name)}] = typeof ${name} === 'undefined' ? undefined : ${name}; } catch {}`)
      .join('\n')
    vm.runInContext(`${code}\n;${captureStatements}`, sandbox, { timeout: 5000, filename: 'user-code.js' })

    const t1 = performance.now()
    const memAfter = process.memoryUsage().heapUsed
    const executionMs = parseFloat((t1 - t0).toFixed(3))
    const memoryUsedMB = parseFloat(((memAfter - memBefore) / 1024 / 1024).toFixed(4))

    // Capture user-defined variables from sandbox
    const skipKeys = new Set([
      'console', 'setTimeout', 'clearTimeout', 'Math', 'JSON', 'Date',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Array', 'Object',
      'String', 'Number', 'Boolean', 'Promise', '__capture__'
    ])
    const variables: Record<string, unknown> = { ...capturedVars }
    for (const [key, val] of Object.entries(sandbox)) {
      if (!skipKeys.has(key)) {
        variables[key] = val
      }
    }

    // Functions (including the welcome example's greet) cannot cross IPC.
    // Preserve cloneable values and represent unsupported values as text.
    for (const [key, val] of Object.entries(variables)) {
      try { variables[key] = deserialize(serialize(val)) }
      catch { variables[key] = inspect(val, { depth: 2, customInspect: false, getters: false }) }
    }

    return {
      success: true,
      output: outputLogs.join('\n') || '✅ Executed (no output)',
      executionMs,
      memoryUsedMB,
      variables,
    }
  } catch (err: unknown) {
    const t1 = performance.now()
    const e = err as Error
    return {
      success: false,
      output: `${e.name}: ${e.message}`,
      errorRaw: e.message,
      errorName: e.name,
      executionMs: parseFloat((t1 - t0).toFixed(3)),
    }
  }
}

// ─── File System Helpers ───────────────────────────────────────────────────
function readDirRecursive(dirPath: string, depth = 0): unknown[] {
  if (depth > 5) return []
  try {
    const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'release'])
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDir: entry.isDirectory(),
        children: entry.isDirectory() && !ignoredDirectories.has(entry.name)
          ? readDirRecursive(path.join(dirPath, entry.name), depth + 1)
          : undefined,
      }))
  } catch {
    return []
  }
}

let workspaceRoot: string | null = null

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

function workspacePath(candidate: unknown, options: { allowRoot?: boolean } = {}): string {
  if (!workspaceRoot) throw new Error('Open a workspace folder first.')
  if (typeof candidate !== 'string' || candidate.trim() === '') throw new Error('A valid path is required.')

  const resolved = path.resolve(candidate)
  if (!isPathInside(workspaceRoot, resolved)) throw new Error('Path is outside the open workspace.')

  // Resolve the nearest existing ancestor as well, preventing a workspace symlink
  // from redirecting reads or writes outside the folder the user selected.
  let existingAncestor = resolved
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor)
    if (parent === existingAncestor) break
    existingAncestor = parent
  }
  const realAncestor = fs.realpathSync(existingAncestor)
  const projectedRealPath = path.resolve(realAncestor, path.relative(existingAncestor, resolved))
  if (!isPathInside(workspaceRoot, projectedRealPath)) throw new Error('Path resolves outside the open workspace.')

  if (!options.allowRoot && resolved === workspaceRoot) throw new Error('This operation is not allowed on the workspace root.')
  return resolved
}

function refreshWorkspace() {
  if (!workspaceRoot) return null
  return { root: workspaceRoot, tree: readDirRecursive(workspaceRoot) }
}

function gitRoot(candidate: unknown): string {
  const resolved = workspacePath(candidate, { allowRoot: true })
  if (resolved !== workspaceRoot) throw new Error('Git operations are limited to the open workspace root.')
  return resolved
}

function gitFile(root: string, candidate: unknown): string {
  if (candidate === '.') return '.'
  if (typeof candidate !== 'string' || candidate.trim() === '') throw new Error('A valid Git path is required.')
  const resolved = workspacePath(path.resolve(root, candidate))
  return path.relative(root, resolved).split(path.sep).join('/')
}

// ─── AI Ollama Helpers ──────────────────────────────────────────────────────
let userApiKey: string = ''

function parseModelNames(responseBody: string): string[] {
  const data = JSON.parse(responseBody) as { models?: unknown }
  if (!Array.isArray(data.models)) return []
  return data.models.flatMap((model) => {
    if (!model || typeof model !== 'object' || !('name' in model) || typeof model.name !== 'string') return []
    return [model.name.split(':')[0]]
  })
}

function startOllamaService(): Promise<boolean> {
  return new Promise((resolve) => {
    // Attempt to spawn 'ollama serve'
    const proc = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    })
    proc.once('error', () => resolve(false))
    proc.unref()

    // Check status after 3 seconds
    setTimeout(async () => {
      const check = await checkOllamaService()
      resolve(check.success)
    }, 3000)
  })
}

function checkOllamaService(): Promise<{ success: boolean; models: string[] }> {
  return new Promise((resolve) => {
    const isCloud = !!userApiKey
    if (isCloud) {
      const options = {
        hostname: 'ollama.com',
        port: 443,
        path: '/api/tags',
        method: 'GET',
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
      const req = https.request(options, (res) => {
        let chunks = ''
        res.on('data', (d) => { chunks += d })
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const models = parseModelNames(chunks)
              const finalModels = models.length > 0 ? models : ['qwen3-coder:480b-cloud', 'codellama:cloud']
              resolve({ success: true, models: finalModels })
            } catch {
              resolve({ success: true, models: ['qwen3-coder:480b-cloud', 'codellama:cloud'] })
            }
          } else {
            resolve({ success: false, models: [] })
          }
        })
      })
      req.on('error', () => resolve({ success: false, models: [] }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, models: [] })
      })
      req.end()
    } else {
      const req = http.request(
        { hostname: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET', timeout: 2000 },
        (res) => {
          let chunks = ''
          res.on('data', (d) => { chunks += d })
          res.on('end', () => {
            if (res.statusCode !== 200) {
              resolve({ success: false, models: [] })
              return
            }
            try {
              const models = parseModelNames(chunks)
              resolve({ success: true, models })
            } catch {
              resolve({ success: true, models: [] })
            }
          })
        }
      )
      req.on('error', () => resolve({ success: false, models: [] }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, models: [] })
      })
      req.end()
    }
  })
}

async function getActiveModel(): Promise<string> {
  if (userApiKey) {
    return 'qwen3-coder:480b-cloud'
  }
  const check = await checkOllamaService()
  if (check.success && check.models.length > 0) {
    if (check.models.includes('codellama')) return 'codellama'
    return check.models[0]
  }
  return 'codellama'
}

function ollamaRequest(payload: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const isCloud = !!userApiKey
    const finalPayload = isCloud ? { ...payload, model: 'qwen3-coder:480b-cloud' } : payload
    const body = JSON.stringify(finalPayload)
    
    const options = isCloud ? {
      hostname: 'ollama.com',
      port: 443,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${userApiKey}`
      }
    } : {
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }
    
    const lib = isCloud ? https : http
    const req = lib.request({ ...options, timeout: 60_000 }, (res) => {
      let chunks = ''
      res.on('data', (d) => {
        chunks += d
        if (Buffer.byteLength(chunks) > 10 * 1024 * 1024) req.destroy(new Error('AI response exceeded 10 MB.'))
      })
      res.on('end', () => {
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`Ollama request failed with status ${res.statusCode}.`))
          return
        }
        try {
          const lines = chunks.trim().split('\n')
          const text = lines
            .map((l: string) => { try { return JSON.parse(l).response ?? '' } catch { return '' } })
            .join('')
          resolve(text)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Ollama request timed out.')))
    req.write(body)
    req.end()
  })
}

// ─── HTTP Proxy (for API Tester) ───────────────────────────────────────────
interface HttpReqOptions {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

function proxyHttpRequest(opts: HttpReqOptions): Promise<{ status: number; headers: object; body: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now()
    let parsedUrl: URL
    try { parsedUrl = new URL(opts.url) } catch { reject(new Error('Invalid URL')); return }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      reject(new Error('Only HTTP and HTTPS URLs are supported.'))
      return
    }
    const method = String(opts.method || 'GET').toUpperCase()
    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
    if (!allowedMethods.has(method)) {
      reject(new Error('Unsupported HTTP method.'))
      return
    }

    const lib = parsedUrl.protocol === 'https:' ? https : http
    const reqOpts = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: opts.headers || {},
      timeout: 30_000,
    }

    const req = lib.request(reqOpts, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
        if (Buffer.byteLength(data) > 10 * 1024 * 1024) req.destroy(new Error('Response exceeded 10 MB.'))
      })
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: data,
          durationMs: parseFloat((performance.now() - t0).toFixed(2)),
        })
      })
    })

    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Request timed out after 30 seconds.')))
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

// ─── Window Setup ──────────────────────────────────────────────────────────
let win: BrowserWindow | null
let shellProcess: ChildProcessWithoutNullStreams | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#0d1117',
    icon: path.join(process.env.VITE_PUBLIC!, 'branding', process.platform === 'win32' ? 'icon.ico' : 'logo-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  win.on('ready-to-show', () => {
    win?.show()
    if (VITE_DEV_SERVER_URL) win?.webContents.openDevTools({ mode: 'detach' })
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win?.webContents.getURL()
    if (currentUrl && url !== currentUrl) event.preventDefault()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Code execution
  ipcMain.handle('execute-js', async (_e, code: string) => runUserCode(code))

  // Node.js Execution
  ipcMain.handle('execute-node', async (_e, filePath: string) => {
    return new Promise((resolve) => {
      let safeFilePath: string
      try {
        safeFilePath = workspacePath(filePath)
        if (!fs.statSync(safeFilePath).isFile()) throw new Error('The selected path is not a file.')
      } catch (error) {
        resolve({ success: false, output: (error as Error).message, errorRaw: (error as Error).message })
        return
      }
      const t0 = performance.now()
      execFile(process.execPath, [safeFilePath], {
        cwd: path.dirname(safeFilePath),
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      }, (error, stdout, stderr) => {
        const t1 = performance.now()
        const executionMs = parseFloat((t1 - t0).toFixed(3))
        if (error) {
          resolve({
            success: false,
            output: stdout + '\n' + stderr + '\n' + `❌ Process exited with code ${error.code}`,
            executionMs,
            errorRaw: error.message,
          })
        } else {
          resolve({
            success: true,
            output: stdout + (stderr ? '\n' + stderr : ''),
            executionMs,
          })
        }
      })
    })
  })

  // Shell Terminal
  ipcMain.handle('terminal:init', (event, cwd?: string) => {
    if (shellProcess) {
      try { shellProcess.kill() } catch { /* process already exited */ }
    }
    const shellExec = process.platform === 'win32' ? 'powershell.exe' : 'bash'
    let startDir = app.getPath('home')
    if (cwd) {
      try { startDir = workspacePath(cwd, { allowRoot: true }) }
      catch (error) { return { success: false, error: (error as Error).message } }
    }
    shellProcess = spawn(shellExec, [], {
      env: { ...process.env },
      cwd: startDir,
    })

    shellProcess.stdout.on('data', (data) => {
      event.sender.send('terminal:data', data.toString())
    })

    shellProcess.stderr.on('data', (data) => {
      event.sender.send('terminal:data', data.toString())
    })

    shellProcess.on('close', () => {
      try {
        event.sender.send('terminal:data', '\r\n[Shell process exited]\r\n')
      } catch { /* window closed */ }
      shellProcess = null
    })
    shellProcess.on('error', (error) => {
      try { event.sender.send('terminal:data', `\r\n[Unable to start shell: ${error.message}]\r\n`) } catch { /* window closed */ }
      shellProcess = null
    })
    return { success: true }
  })

  ipcMain.handle('terminal:write', (_event, data: string) => {
    if (shellProcess && shellProcess.stdin) {
      shellProcess.stdin.write(data)
    }
  })

  // File system
  ipcMain.handle('fs:open-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    workspaceRoot = fs.realpathSync(result.filePaths[0])
    return refreshWorkspace()
  })

  ipcMain.handle('fs:refresh-folder', async () => refreshWorkspace())
  ipcMain.handle('fs:close-folder', async () => {
    workspaceRoot = null
    return { success: true }
  })

  ipcMain.handle('fs:read-file', async (_e, filePath: string) => {
    try { return { content: fs.readFileSync(workspacePath(filePath), 'utf-8'), success: true } }
    catch (err) { return { content: '', success: false, error: (err as Error).message } }
  })

  ipcMain.handle('fs:write-file', async (_e, filePath: string, content: string) => {
    try { fs.writeFileSync(workspacePath(filePath), String(content), 'utf-8'); return { success: true } }
    catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('fs:create-file', async (_e, filePath: string) => {
    try {
      const safePath = workspacePath(filePath)
      fs.mkdirSync(path.dirname(safePath), { recursive: true })
      fs.writeFileSync(safePath, '', { encoding: 'utf-8', flag: 'wx' })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('fs:create-folder', async (_e, dirPath: string) => {
    try {
      fs.mkdirSync(workspacePath(dirPath), { recursive: false })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('fs:delete-file', async (_e, filePath: string) => {
    try {
      const safePath = workspacePath(filePath)
      if (!fs.existsSync(safePath)) throw new Error('The file or folder no longer exists.')
      await shell.trashItem(safePath)
      return { success: true }
    }
    catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('fs:rename', async (_e, oldPath: string, newPath: string) => {
    try {
      const safeOldPath = workspacePath(oldPath)
      const safeNewPath = workspacePath(newPath)
      if (fs.existsSync(safeNewPath)) throw new Error('A file or folder with that name already exists.')
      fs.renameSync(safeOldPath, safeNewPath)
      return { success: true }
    }
    catch (err) { return { success: false, error: (err as Error).message } }
  })

  // AI Error Interceptor
  ipcMain.handle('ai:explain-error', async (_e, errorMsg: string, code: string) => {
    const prompt = `You are a senior JavaScript developer. A user's code threw this error:

Error: ${errorMsg}

Code:
\`\`\`javascript
${code.slice(0, 1500)}
\`\`\`

Respond in this EXACT JSON format with no extra text:
{
  "cause": "1-2 sentence explanation of why this error occurred",
  "fix": "the corrected full code block only",
  "hint": "one actionable tip"
}`
    try {
      const modelName = await getActiveModel()
      const raw = await ollamaRequest({ model: modelName, prompt, stream: true })
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) return { success: true, ...JSON.parse(jsonMatch[0]) }
      return { success: true, cause: raw, fix: null, hint: '' }
    } catch {
      return { success: false, cause: 'Ollama is not running or no model loaded.', fix: null, hint: 'Run: ollama run codellama' }
    }
  })

  // AI Chat / Code completion
  ipcMain.handle('ai:chat', async (_e, prompt: string) => {
    try {
      const modelName = await getActiveModel()
      const raw = await ollamaRequest({ model: modelName, prompt, stream: true })
      return { success: true, response: raw }
    } catch {
      return { success: false, response: 'Ollama not available.' }
    }
  })

  // AI Health Check
  ipcMain.handle('ai:check', async () => {
    return checkOllamaService()
  })

  // Set API key for Cloud Ollama
  ipcMain.handle('ai:set-api-key', async (_e, key: string) => {
    userApiKey = typeof key === 'string' ? key.trim() : ''
    return { success: true }
  })

  // Open external URL in user browser
  ipcMain.handle('open-external-url', async (_e, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || !['ollama.com', 'www.ollama.com'].includes(parsed.hostname)) {
        throw new Error('This link is not allowed.')
      }
      await shell.openExternal(url)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unable to open link.' }
    }
  })

  // Start Ollama Service
  ipcMain.handle('ai:start-service', async () => {
    return startOllamaService()
  })

  // Pull Model from Ollama Registry
  ipcMain.handle('ai:pull-model', async (event, modelName: string) => {
    return new Promise((resolve) => {
      if (!/^[a-zA-Z0-9._:/-]+$/.test(modelName)) {
        resolve({ success: false, error: 'Invalid model name.' })
        return
      }
      const body = JSON.stringify({ name: modelName, stream: true })
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 11434,
          path: '/api/pull',
          method: 'POST',
          timeout: 10 * 60_000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let buffer = ''
          res.on('data', (chunk) => {
            buffer += chunk.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const data = JSON.parse(line)
                let percentage = 0
                if (data.total > 0 && data.completed > 0) {
                  percentage = Math.round((data.completed / data.total) * 100)
                }
                event.sender.send('ai:pull-progress', {
                  status: data.status,
                  percentage
                })
              } catch { /* ignore incomplete progress records */ }
            }
          })
          res.on('end', () => resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 300
            ? { success: true }
            : { success: false, error: `Ollama returned status ${res.statusCode}.` }))
        }
      )
      req.on('error', (err) => resolve({ success: false, error: err.message }))
      req.on('timeout', () => req.destroy(new Error('Model download timed out.')))
      req.write(body)
      req.end()
    })
  })

  // HTTP Proxy for API Tester
  ipcMain.handle('http:request', async (_e, opts: HttpReqOptions) => {
    try { return { success: true, ...(await proxyHttpRequest(opts)) } }
    catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Git IPC Handlers
  ipcMain.handle('git:status', async (_e, rootPath: string) => {
    try {
      const git = simpleGit(gitRoot(rootPath))
      const isRepo = await git.checkIsRepo()
      if (!isRepo) return { success: false, error: 'Not a Git repository.' }
      const status = await git.status()
      return { success: true, files: status.files }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:log', async (_e, rootPath: string) => {
    try {
      const git = simpleGit(gitRoot(rootPath))
      const isRepo = await git.checkIsRepo()
      if (!isRepo) return { success: false, error: 'Not a Git repository.' }
      const log = await git.log()
      return { success: true, commits: log.all }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:branches', async (_e, rootPath: string) => {
    try {
      const git = simpleGit(gitRoot(rootPath))
      const isRepo = await git.checkIsRepo()
      if (!isRepo) return { success: false, error: 'Not a Git repository.' }
      const branches = await git.branch()
      return { success: true, all: branches.all, current: branches.current }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:stage', async (_e, rootPath: string, filePath: string, shouldStage: boolean) => {
    try {
      const root = gitRoot(rootPath)
      const safeFile = gitFile(root, filePath)
      const git = simpleGit(root)
      if (shouldStage) {
        await git.add(safeFile)
      } else {
        await git.reset([safeFile])
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:diff', async (_e, rootPath: string, filePath: string) => {
    try {
      const root = gitRoot(rootPath)
      const git = simpleGit(root)
      const diff = await git.diff([gitFile(root, filePath)])
      return { success: true, diff: diff || 'No changes or untracked file.' }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:commit', async (_e, rootPath: string, commitMsg: string) => {
    try {
      if (typeof commitMsg !== 'string' || !commitMsg.trim()) throw new Error('Commit message cannot be empty.')
      const git = simpleGit(gitRoot(rootPath))
      await git.commit(commitMsg.trim())
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:push', async (_e, rootPath: string) => {
    try {
      const git = simpleGit(gitRoot(rootPath))
      await git.push()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:pull', async (_e, rootPath: string) => {
    try {
      const git = simpleGit(gitRoot(rootPath))
      await git.pull()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:checkout', async (_e, rootPath: string, branchName: string, isNew: boolean) => {
    try {
      if (typeof branchName !== 'string' || !branchName.trim()) throw new Error('Branch name cannot be empty.')
      const git = simpleGit(gitRoot(rootPath))
      if (isNew) {
        await git.checkoutLocalBranch(branchName.trim())
      } else {
        await git.checkout(branchName.trim())
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('before-quit', () => {
  if (shellProcess) {
    try { shellProcess.kill() } catch { /* process already exited */ }
    shellProcess = null
  }
})
