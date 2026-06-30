import { contextBridge, ipcRenderer } from 'electron'

const api = {
  executeJS: (code) => ipcRenderer.invoke('execute-js', code)
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Error in Preload:  ', error)
}