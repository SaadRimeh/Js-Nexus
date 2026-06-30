import vm from 'vm';

export const runUserCode = (code) => {
  const stringify = (val) => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return String(val); }
    }
    return String(val);
  };

  const customConsole = {
    log: (...args) => outputLogs.push(args.map(stringify).join(' ')),
    error: (...args) => outputLogs.push('Error: ' + args.map(stringify).join(' ')),
    warn: (...args) => outputLogs.push('Warning: ' + args.map(stringify).join(' ')),
  };


  const sandbox = { console: customConsole };
  vm.createContext(sandbox);

  try {
    vm.runInContext(code, sandbox, { timeout: 3000 });
    return { success: true, output: outputLogs.join('\n') || 'Code Executed Successfully' };
  } catch (err) {
    return { success: false, output: err.message };
  }
};