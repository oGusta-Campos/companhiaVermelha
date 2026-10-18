function startLocalServer(app, { port, host = '127.0.0.1', initialAdminPassword = null, logger = console, onError } = {}) {
  if (!app || typeof app.listen !== 'function') throw new TypeError('Aplicação com listen() é obrigatória.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError('Porta inválida.');

  if (initialAdminPassword) {
    logger.log('Acesso inicial de administrador (guarde esta senha; ela não será exibida novamente):');
    logger.log('Usuário: admin');
    logger.log(`Senha: ${initialAdminPassword}`);
  }

  const server = app.listen(port, host, () => {
    logger.log(`Companhia Vermelha aberta em: http://${host}:${port}/`);
  });
  if (typeof onError === 'function') server.on('error', onError);
  return server;
}

module.exports = { startLocalServer };
