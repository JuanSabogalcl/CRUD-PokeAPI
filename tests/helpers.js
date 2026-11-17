const { fork } = require('node:child_process');
const http = require('node:http');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const fields = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const stats = Object.fromEntries(fields.map((field) => [field, 48]));

async function launch(dataDir, pokeapiBase, timeout = 500, extraEnv = {}) {
  const child = fork(path.join(root, 'server.js'), [], {
    cwd: root,
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATA_DIR: dataDir,
      AUTO_SYNC_GEN1: 'false', POKEAPI_BASE: pokeapiBase, POKEAPI_TIMEOUT_MS: String(timeout),
      COMBAT_ALLOW_SEED: 'true', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  try {
    const [message] = await once(child, 'message', { signal: AbortSignal.timeout(10000) });
    return { child, base: `http://127.0.0.1:${message.port}`, logs: () => logs };
  } catch (error) {
    child.kill();
    throw new Error(`No arrancó la API: ${logs || error.message}`);
  }
}

async function stop(server) {
  if (!server || server.child.exitCode !== null) return;
  const exited = once(server.child, 'exit');
  server.child.kill();
  await exited;
}

function tempData() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pokeapi-test-')); }

async function request(base, evidence, method, route, body, raw = false) {
  const started = Date.now();
  const response = await fetch(base + route, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  evidence.push({ request: { method, route, body }, response: {
    status: response.status, contentType: response.headers.get('content-type'), body: data,
  }, durationMs: Date.now() - started });
  return { status: response.status, data, contentType: response.headers.get('content-type') };
}

// Petición sin normalizar la ruta (fetch convierte %2E%2E en ..), como haría un cliente HTTP cualquiera.
function rawRequest(base, evidence, method, route) {
  const started = Date.now();
  const url = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: url.hostname, port: url.port, method, path: route }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        const contentType = res.headers['content-type'] || null;
        const headers = Object.fromEntries(['x-powered-by', 'x-content-type-options']
          .map((name) => [name, res.headers[name] ?? null]));
        evidence.push({ request: { method, route, raw: true }, response: { status: res.statusCode, contentType, headers, body: data },
          durationMs: Date.now() - started });
        resolve({ status: res.statusCode, data, contentType, headers: res.headers });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Sin respuesta en 15 s')));
    req.on('error', reject);
    req.end();
  });
}

module.exports = { root, fields, stats, launch, stop, tempData, request, rawRequest };
