const { spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function createTestServer(port) {
  let serverProcess;
  const baseUrl = `http://localhost:${port}`;

  async function waitForReady(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`${baseUrl}/api/stats-labels`);
        if (res.ok) return;
      } catch {
        // servidor aún no acepta conexiones, se reintenta
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`El servidor de pruebas no respondió en el puerto ${port} a tiempo`);
  }

  async function start() {
    serverProcess = spawn('node', ['server.js'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: String(port) },
      stdio: 'ignore',
    });
    await waitForReady(20000);
  }

  function stop() {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }

  return { start, stop, baseUrl };
}

module.exports = { createTestServer };
