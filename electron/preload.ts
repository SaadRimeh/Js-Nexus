import { ipcRenderer, contextBridge } from 'electron'
import type { IpcRendererEvent } from 'electron'

const api = {
  // Code execution
  executeJS: (code: string) => ipcRenderer.invoke('execute-js', code),

  // File system
  openFolder: () => ipcRenderer.invoke('fs:open-folder'),
  refreshFolder: () => ipcRenderer.invoke('fs:refresh-folder'),
  closeFolder: () => ipcRenderer.invoke('fs:close-folder'),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
  createFile: (filePath: string) => ipcRenderer.invoke('fs:create-file', filePath),
  createFolder: (dirPath: string) => ipcRenderer.invoke('fs:create-folder', dirPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete-file', filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  executeNode: (filePath: string) => ipcRenderer.invoke('execute-node', filePath),
  terminalInit: (cwd?: string) => ipcRenderer.invoke('terminal:init', cwd),
  terminalWrite: (data: string) => ipcRenderer.invoke('terminal:write', data),
  onTerminalData: (callback: (data: string) => void) => {
    const subscription = (_event: IpcRendererEvent, value: string) => callback(value)
    ipcRenderer.on('terminal:data', subscription)
    return () => ipcRenderer.off('terminal:data', subscription)
  },
  // AI
  explainError: (errorMsg: string, code: string) => ipcRenderer.invoke('ai:explain-error', errorMsg, code),
  aiChat: (prompt: string) => ipcRenderer.invoke('ai:chat', prompt),
  checkOllama: () => ipcRenderer.invoke('ai:check'),
  startOllama: () => ipcRenderer.invoke('ai:start-service'),
  pullModel: (modelName: string) => ipcRenderer.invoke('ai:pull-model', modelName),
  onPullProgress: (callback: (data: { status?: string; percentage?: number }) => void) => {
    const subscription = (_event: IpcRendererEvent, value: { status?: string; percentage?: number }) => callback(value)
    ipcRenderer.on('ai:pull-progress', subscription)
    return () => ipcRenderer.off('ai:pull-progress', subscription)
  },
  setApiKey: (key: string) => ipcRenderer.invoke('ai:set-api-key', key),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  // HTTP proxy
  httpRequest: (opts: { url: string; method: string; headers: Record<string, string>; body?: string }) =>
    ipcRenderer.invoke('http:request', opts),

  // Git
  gitStatus: (rootPath: string) => ipcRenderer.invoke('git:status', rootPath),
  gitLog: (rootPath: string) => ipcRenderer.invoke('git:log', rootPath),
  gitBranches: (rootPath: string) => ipcRenderer.invoke('git:branches', rootPath),
  gitStage: (rootPath: string, filePath: string, shouldStage: boolean) => ipcRenderer.invoke('git:stage', rootPath, filePath, shouldStage),
  gitDiff: (rootPath: string, filePath: string) => ipcRenderer.invoke('git:diff', rootPath, filePath),
  gitCommit: (rootPath: string, commitMsg: string) => ipcRenderer.invoke('git:commit', rootPath, commitMsg),
  gitPush: (rootPath: string) => ipcRenderer.invoke('git:push', rootPath),
  gitPull: (rootPath: string) => ipcRenderer.invoke('git:pull', rootPath),
  gitCheckout: (rootPath: string, branchName: string, isNew: boolean) => ipcRenderer.invoke('git:checkout', rootPath, branchName, isNew),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
