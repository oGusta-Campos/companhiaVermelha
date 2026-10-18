const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const net = require('node:net');

let startLocalServer = null;
try {
  ({ startLocalServer } = require('../server/startup.js'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

test('mostra a senha inicial mesmo quando a primeira porta está ocupada', async (t) => {
  assert.equal(typeof startLocalServer, 'function', 'server/startup.js deve exportar startLocalServer');
  const occupied = net.createServer();
  await new Promise((resolve, reject) => {
    occupied.once('error', reject);
    occupied.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve) => occupied.close(resolve)));

  const messages = [];
  const password = 'senha-temporaria-de-primeiro-acesso';
  const server = startLocalServer(http.createServer((_request, response) => response.end('ok')), {
    port: occupied.address().port,
    initialAdminPassword: password,
    logger: { log: (message) => messages.push(message), error: (message) => messages.push(message) },
    onError() {}
  });
  const error = await new Promise((resolve) => server.once('error', resolve));

  assert.equal(error.code, 'EADDRINUSE');
  assert.ok(messages.some((message) => message.includes(password)), 'senha precisa ser registrada antes de tentar abrir a porta');
});
