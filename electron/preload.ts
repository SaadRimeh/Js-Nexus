import { ipcRenderer, contextBridge } from 'electron'

console.log('✅ Preload script is running!')

const api = {
  executeJS: (code: string) => ipcRenderer.invoke('execute-js', code)
}

contextBridge.exposeInMainWorld('api', api)
console.log('✅ window.api has been exposed!')
