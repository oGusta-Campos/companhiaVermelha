# Login opcional e administração local — especificação

## Objetivo

Acrescentar ao site Companhia Vermelha um login opcional de usuário e uma área administrativa local. A navegação pública atual continua aberta; só operações de administração exigem credencial de administrador.

## Experiência e escopo

- O visitante pode acessar todas as páginas públicas sem entrar.
- Uma tela de login aceita usuários comuns e administradores. Usuários comuns podem entrar e sair, sem recursos adicionais.
- Administradores acessam uma página `/admin`, podem cadastrar usuários e escolher entre os papéis `user` e `admin`.
- Na área administrativa, o administrador gerencia os cards de Destinos e do Caderno Vermelho: criar, editar e apagar; definir título, país/categoria, resumo, texto detalhado, tags e, opcionalmente, o caminho de uma imagem que já exista em `assets/images`.
- Os cards atuais são carregados no banco na primeira inicialização. Uma inicialização posterior não sobrescreve edições feitas no painel.
- O mapa e o comparador de destinos permanecem fixos. Upload de arquivos, redefinição de senha e recursos para usuários comuns ficam fora do escopo.

## Arquitetura

- Adicionar um servidor Express em `server.js`, mantendo HTML, CSS e JavaScript atuais. O servidor escuta somente em `127.0.0.1`; a porta padrão será `3000`, configurável por `PORT`.
- `npm start` executa o servidor; `node server.js` também deve funcionar. A inicialização informa no terminal a URL local aberta.
- O servidor disponibiliza apenas as páginas e pastas públicas necessárias (`css`, `js` e `assets`). O banco e os arquivos da administração não ficam expostos por um diretório estático abrangente.
- Criar o painel em uma pasta não pública e entregá-lo somente por uma rota que valide a sessão e o papel `admin`.
- Criar uma API JSON para login/logout, consulta dos cards, administração de usuários e CRUD de cards. A checagem de autorização ocorre no servidor em toda rota de escrita e em toda rota administrativa; ocultar botões no navegador não conta como proteção.
- Usar SQLite pelo módulo integrado `node:sqlite` do Node 24 disponível no ambiente. O arquivo do banco fica em `data/companhia-vermelha.sqlite`, fora das pastas servidas como estáticas. Como `node:sqlite` ainda tem status experimental no Node 24, manter seu uso isolado em um módulo pequeno para facilitar substituição se necessário.
- Tabelas: `users` (nome de usuário único, hash e salt da senha, papel, data de criação) e `cards` (tipo, título, país/categoria, resumo, conteúdo detalhado, tags, caminho opcional da imagem, ordem e datas de criação/atualização). Os campos de texto são armazenados como texto simples; tags como JSON.

## Credenciais e sessões

- Na primeira execução sem usuário administrador, criar `admin` com uma senha aleatória forte, guardar somente seu hash com `crypto.scrypt` e mostrar a senha gerada no terminal para o proprietário salvar. Não fixar senha fraca no código nem imprimir a senha em execuções seguintes.
- Criar sessão de servidor com `express-session`; cookies `HttpOnly`, `SameSite=Strict` e duração limitada. Como o sistema é estritamente local e de demonstração, a sessão pode ficar em memória e será encerrada quando o servidor reiniciar; contas e cards continuam persistidos no SQLite.
- Regenerar o identificador da sessão após login, encerrar a sessão no logout e validar o papel consultando dados confiáveis do servidor.
- Esta versão destina-se a uso local escolar, não a implantação pública. Uma publicação futura exige, entre outras medidas, armazenamento persistente de sessões, HTTPS, gestão de segredos e revisão de segurança.

## Interface e conteúdo

- Adicionar links discretos para entrar/sair sem alterar a navegação pública existente.
- A página de login deve manter o visual do site e exibir erros compreensíveis sem revelar se um nome de usuário existe.
- O painel deve separar gerenciamento de usuários e gerenciamento de cards, com formulários simples e confirmação antes de excluir.
- Usar `textContent`/elementos DOM para inserir conteúdo editável, evitando interpretar texto de cards como HTML. Validar limites e tipos no servidor; permitir imagem somente por caminho relativo dentro de `assets/images`.
- A página pública busca os cards na API e conserva filtros e apresentação atuais. Se a API falhar, exibir uma mensagem clara; os cards iniciais devem estar disponíveis após o seed.

## Verificação de aceite

1. `npm start` e `node server.js` iniciam o site e informam URL/porta; páginas públicas continuam acessíveis sem login.
2. A primeira execução gera e exibe credencial inicial de `admin`; senha incorreta é recusada e a senha não fica salva em texto puro.
3. Usuário comum consegue entrar e sair, mas não abre o painel nem executa operações administrativas.
4. Administrador abre `/admin`, cria usuários dos dois papéis e cria, edita e exclui cards de Destinos e Caderno.
5. Cards e contas persistem após reiniciar o servidor; o seed não reverte conteúdo editado.
6. Rotas administrativas rejeitam acesso anônimo e de usuário comum mesmo se chamadas diretamente; texto de card não executa HTML/script.
7. Páginas, filtros, links e modal do Caderno continuam funcionais, sem regressão visual grave em desktop e celular.

## Instalação

O SQLite e o `crypto.scrypt` vêm com o Node. As dependências externas planejadas são Express e `express-session`; a instalação documentada será `npm install express express-session`, seguida de `npm start`. O requisito é Node 24 ou superior.

## Referências técnicas

- [Documentação do módulo SQLite do Node 24](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [Documentação do middleware de sessão do Express](https://expressjs.com/en/resources/middleware/session/)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
