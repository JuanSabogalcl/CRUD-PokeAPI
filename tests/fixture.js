const http = require('node:http');
const { once } = require('node:events');
const { fields } = require('./helpers');

// Datos sintéticos controlados. No representan los 151 valores oficiales.
async function createFixture() {
  const state = { failure: false, brokenDetail: false };
  const names = Array.from({ length: 151 }, (_, i) => `pokemon-${i + 1}`);
  names[0] = 'bulbasaur'; names[24] = 'pikachu'; names[131] = 'ditto'; names[150] = 'mew';
  let base;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (state.failure) return send(503, { error: 'Fallo simulado del proveedor' });
    const key = decodeURIComponent(url.pathname.split('/')[4] || '');
    if (key === 'slow') return; // El cliente debe cortar por timeout.
    if (key === 'broken-json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{');
    }
    if (!key) {
      const limit = Number(url.searchParams.get('limit') || 151);
      const offset = Number(url.searchParams.get('offset') || 0);
      return send(200, { count: 1350, results: Array.from({ length: Math.max(0, limit) }, (_, i) => {
        const id = offset + i + 1;
        return { name: names[id - 1] || `pokemon-${id}`, url: `${base}/${id}` };
      }) });
    }
    const id = /^\d+$/.test(key) ? Number(key) : names.indexOf(key) + 1;
    if (state.brokenDetail && id === 40) return send(503, { error: 'Detalle no disponible' });
    if (id < 1 || id > 151) return send(404, { error: 'Not found' });
    const values = id === 25 ? [35, 55, 40, 50, 50, 90] : [48, 48, 48, 48, 48, 48];
    return send(200, { id, name: names[id - 1],
      stats: fields.map((name, index) => ({ stat: { name }, base_stat: values[index] })),
      sprites: { front_default: `https://example.test/${id}.png` },
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/v2/pokemon`;
  return { base, state, close: async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  } };
}
module.exports = { createFixture };
