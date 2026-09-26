// Run the built application in a hidden window and verify the real preload/IPC.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app } = require('electron');

const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'node_modules/.cache/electron-smoke'));
app.disableHardwareAcceleration();
const timeout = setTimeout(() => fail(new Error('Electron startup timed out.')), 45000);

function fail(error) {
  console.error(error);
  clearTimeout(timeout);
  app.exit(1);
}

process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);
app.on('browser-window-created', (_event, window) => {
  window.show = () => {};
  window.webContents.openDevTools = () => {};
  window.webContents.on('preload-error', (_event, _file, error) => fail(error));
  window.webContents.on('did-fail-load', (_event, code, description) => {
    fail(new Error(`Page load failed (${code}): ${description}`));
  });
  window.webContents.once('did-finish-load', async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(async () => {
        if (!window.api) throw new Error('Preload API is missing');
        const deadline = Date.now() + 15000;
        while (!document.getElementById('root')?.textContent?.trim()) {
          if (Date.now() > deadline) throw new Error('React did not render the application');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        const logo = document.querySelector('img[alt="JS Nexus logo"]');
        if (!logo) throw new Error('Application logo is missing');
        await logo.decode();
        if (!logo.naturalWidth) throw new Error('Application logo did not load');
        const execution = await window.api.executeJS('const answer = 6 * 7; console.log(answer)');
        const welcome = await window.api.executeJS('const greet = name => "Hello, " + name; console.log(greet("World")); const helpers = { greet };');
        const git = await window.api.gitStatus('');
        return { title: document.title, execution, welcome, git };
      })()`);
      assert.equal(result.title, 'JS Nexus');
      assert.equal(result.execution.success, true);
      assert.equal(result.execution.output, '42');
      assert.equal(result.execution.variables.answer, 42);
      assert.equal(result.welcome.success, true);
      assert.equal(result.welcome.output, 'Hello, World');
      assert.equal(typeof result.welcome.variables.greet, 'string');
      assert.equal(typeof result.welcome.variables.helpers, 'string');
      assert.equal(result.git.success, false);
      assert.match(result.git.error, /workspace/i);
      console.log('PASS: Electron main, sandboxed preload, React rendering, logo loading, execution IPC, and Git IPC.');
      clearTimeout(timeout);
      app.exit(0);
    } catch (error) { fail(error); }
  });
});

import(pathToFileURL(path.join(root, 'dist-electron/main.js')).href).catch(fail);
