import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Worker imports must pass through Vite's worker transform in development.
  optimizeDeps: { exclude: ['monaco-editor'] },
  resolve: {
    alias: {
      'monaco-editor': path.resolve(import.meta.dirname, 'node_modules/monaco-editor'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react'
          if (id.includes('/node_modules/@monaco-editor/') || id.includes('/node_modules/monaco-editor/')) return 'editor'
          if (id.includes('/node_modules/@xterm/')) return 'terminal'
        },
      },
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            // Let Node load simple-git's CommonJS dependencies natively.
            rollupOptions: { external: ['simple-git'] },
          },
        },
      },
      {
        onstart({ reload }) { reload() },
        vite: {
          build: {
            rollupOptions: {
              input: path.join(import.meta.dirname, 'electron/preload.ts'),
              output: {
                // Sandboxed Electron preloads require a single CommonJS file.
                format: 'cjs',
                entryFileNames: 'preload.cjs',
                codeSplitting: false,
              },
            },
          },
        },
      },
    ]),
  ],
})
