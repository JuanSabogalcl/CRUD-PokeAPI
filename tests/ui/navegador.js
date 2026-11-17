// Control mínimo de Microsoft Edge por el protocolo de DevTools (CDP), sin dependencias:
// usa el WebSocket incluido en Node 22+. Los clics y el teclado se envían como eventos reales
// de entrada, de modo que el navegador aplica sus propias validaciones (required, min, max).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((file) => fs.existsSync(file));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  static connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new Cdp(ws));
      ws.onerror = () => reject(new Error(`No se pudo conectar a ${url}`));
    });
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
      } else if (message.method) {
        (this.handlers.get(message.method) || []).forEach((handler) => handler(message.params));
      }
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, handler) {
    this.handlers.set(method, [...(this.handlers.get(method) || []), handler]);
  }

  close() { this.ws.close(); }
}

// Registra en la página los avisos (toast) y los mensajes del combate tal como los ve el usuario.
const TRACKER = `
  window.__toasts = []; window.__msgs = [];
  document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');
    if (toast) new MutationObserver(() => {
      if (toast.classList.contains('hidden') || !toast.textContent) return;
      const type = toast.className.includes('error') ? 'error' : 'success';
      const last = window.__toasts[window.__toasts.length - 1];
      if (!last || last.text !== toast.textContent || last.type !== type) window.__toasts.push({ text: toast.textContent, type });
    }).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });
    const message = document.getElementById('message');
    if (message) new MutationObserver(() => {
      const text = message.textContent; const list = window.__msgs;
      if (list.length && text.startsWith(list[list.length - 1])) list[list.length - 1] = text;
      else if (text) list.push(text);
    }).observe(message, { childList: true, characterData: true, subtree: true });
  });`;

const KEYS = {
  Enter: { code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Escape: { code: 'Escape', windowsVirtualKeyCode: 27 },
  ArrowDown: { code: 'ArrowDown', windowsVirtualKeyCode: 40 },
  ArrowRight: { code: 'ArrowRight', windowsVirtualKeyCode: 39 },
};

class Page {
  constructor(cdp, base) {
    this.cdp = cdp;
    this.base = base;
    this.requests = [];
    this.consoleErrors = [];
    this.acceptDialogs = true;
    this.dialogs = [];
    this.failing = null;
    cdp.on('Network.requestWillBeSent', ({ request }) => {
      if (request.url.includes('/api/')) this.requests.push({ method: request.method, url: request.url.replace(base, '') });
    });
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      this.consoleErrors.push(exceptionDetails.exception?.description || exceptionDetails.text);
    });
    cdp.on('Page.javascriptDialogOpening', ({ message }) => {
      this.dialogs.push({ message, accepted: this.acceptDialogs });
      cdp.send('Page.handleJavaScriptDialog', { accept: this.acceptDialogs });
    });
    cdp.on('Fetch.requestPaused', ({ requestId }) => {
      cdp.send('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' });
    });
  }

  async goto(route) {
    const loaded = new Promise((resolve) => this.cdp.on('Page.loadEventFired', resolve));
    await this.cdp.send('Page.navigate', { url: this.base + route });
    await loaded;
    await sleep(300);
  }

  async eval(expression) {
    const result = await this.cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`Error en la página: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
    return result.result.value;
  }

  async waitFor(expression, { timeout = 8000, message } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = await this.eval(expression).catch(() => null);
      if (value) return value;
      await sleep(100);
    }
    throw new Error(message || `No se cumplió a tiempo: ${expression}`);
  }

  // Centro del elemento visible, después de desplazarlo al centro de la pantalla.
  async point(selector) {
    const box = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();
      return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
    if (!box) throw new Error(`No se encontró visible: ${selector}`);
    return box;
  }

  async click(selector, clickCount = 1) {
    const { x, y } = await this.point(selector);
    for (let count = 1; count <= clickCount; count += 1) {
      await this.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: count });
      await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: count });
    }
  }

  dblclick(selector) { return this.click(selector, 2); }

  // Escribe como un usuario: enfoca el campo, borra su contenido y teclea el texto.
  async type(selector, text) {
    await this.click(selector);
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2,
      windowsVirtualKeyCode: 65, commands: ['selectAll'] });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    if (text) await this.cdp.send('Input.insertText', { text });
  }

  async key(name) {
    const info = KEYS[name];
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, ...info });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: info.code, windowsVirtualKeyCode: info.windowsVirtualKeyCode });
  }

  async select(selector, value) {
    await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
      el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  }

  // Simula que la red falla para las peticiones cuya URL coincide con el patrón.
  async failRequests(pattern) {
    if (pattern) await this.cdp.send('Fetch.enable', { patterns: [{ urlPattern: pattern }] });
    else await this.cdp.send('Fetch.disable');
  }

  async screenshot(file, selector) {
    if (selector) await this.eval(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center' })`);
    await sleep(250);
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
  }

  toasts() { return this.eval('window.__toasts'); }
  messages() { return this.eval('window.__msgs'); }
}

async function launchEdge() {
  if (!EDGE) throw new Error('No se encontró Microsoft Edge');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-ui-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i += 1) await sleep(100);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
  const browser = await Cdp.connect(version.webSocketDebuggerUrl);

  return {
    version: version.Browser,
    // Cada página va en un contexto propio (sin datos compartidos) de 1280 × 900.
    async newPage(base) {
      const { browserContextId } = await browser.send('Target.createBrowserContext');
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const cdp = await Cdp.connect(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
      const page = new Page(cdp, base);
      await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: TRACKER });
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      page.close = async () => { cdp.close(); await browser.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {}); };
      return page;
    },
    async close() {
      browser.close();
      const exited = new Promise((resolve) => proc.once('exit', resolve));
      proc.kill();
      await Promise.race([exited, sleep(3000)]);
      // Edge puede tardar en soltar archivos del perfil temporal; si no se borra, no afecta la ronda.
      try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
    },
  };
}

module.exports = { launchEdge, sleep };
