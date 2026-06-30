import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

function runUserCode(code: string) {

  const stringify = (val: unknown): string => {
    if (val === null) return 'null'
    if (val === undefined) return 'undefined'
    if (typeof val === 'object') {
      try { return JSON.stringify(val) } catch { return String(val) }
    }
    return String(val)
  }

  const outputLogs: string[] = []
  const customConsole = {
    log: (...args: unknown[]) => outputLogs.push(args.map(stringify).join(' ')),
    error: (...args: unknown[]) => outputLogs.push('Error: ' + args.map(stringify).join(' ')),
    warn: (...args: unknown[]) => outputLogs.push('Warning: ' + args.map(stringify).join(' ')),
  }
  const sandbox = { console: customConsole }
  vm.createContext(sandbox)
  try {
    vm.runInContext(code, sandbox, { timeout: 3000 })
    return { success: true, output: outputLogs.join('\n') || 'تم التنفيذ بنجاح (لا توجد مخرجات)' }
  } catch (err: unknown) {
    return { success: false, output: (err as Error).message }
  }
}


let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC!, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => {
    win?.show()

    if (VITE_DEV_SERVER_URL) {
      win?.webContents.openDevTools()
    }
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  console.log('✅ Electron app.whenReady fired!')
  console.log('VITE_DEV_SERVER_URL:', process.env['VITE_DEV_SERVER_URL'])

  ipcMain.handle('execute-js', async (_event, code: string) => {
    console.log('تم استلام الكود في الخلفية بنجاح!')
    return runUserCode(code)
  })

  console.log('✅ IPC handler registered. Creating window...')
  createWindow()
})
