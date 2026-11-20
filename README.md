# Companhia Vermelha — servidor local

Este projeto mantém as páginas públicas acessíveis sem login e acrescenta uma área administrativa local. Requer Node.js 24 ou superior.

## Instalação e execução

Abra o terminal nesta pasta do projeto e instale as dependências:

```powershell
npm install express express-session
```

Inicie com:

```powershell
npm start
```

Ou, sem o script npm:

```powershell
node server.js
```

O servidor informa no terminal o endereço aberto. Por padrão, o site fica em <http://127.0.0.1:3000/>. Pressione `Ctrl+C` no terminal para encerrar.

Se a porta 3000 já estiver ocupada, use outra no PowerShell:

```powershell
$env:PORT=3001; npm start
```

## Acessos

- As páginas públicas não exigem login.
- O formulário de acesso fica em <http://127.0.0.1:3000/login.html>.
- O painel fica em <http://127.0.0.1:3000/admin> e exige perfil de administrador.
- Na primeira execução, o terminal informa a senha aleatória inicial do usuário `admin`. Guarde-a: por segurança, ela não é exibida novamente.
- Depois de entrar como admin, use a área de usuários para criar acessos comuns ou outros administradores. O botão “Apagar” exclui uma conta após confirmação e encerra seu acesso. Sua própria conta e o último administrador ficam protegidos.
- No painel, escolha entre Destinos e Caderno Vermelho para adicionar, editar ou apagar cards. A imagem deve ser um caminho de arquivo já existente em `public/assets/images/` (informado como `assets/images/...`); esta versão não tem upload.

## Dados locais

O SQLite é criado em `data/companhia-vermelha.sqlite`, com os cards iniciais copiados de `data/seed-cards.json`. O banco e os arquivos auxiliares são ignorados pelo Git para não publicar senhas nem conteúdo criado localmente. As senhas são armazenadas em hash; as sessões ficam em memória e são encerradas quando o servidor reinicia.

As senhas de usuários comuns e administradores criados pelo painel não têm regra de tamanho ou composição. O campo também pode ficar vazio.

Ao rodar localmente, o servidor escuta somente em `127.0.0.1`. Para publicar na internet, veja a seção sobre o Vercel acima.

## Estrutura

- `public/`: páginas públicas, CSS, JavaScript e imagens (no Vercel, servidos direto pela CDN).
- `admin/admin.html`: painel, entregue só pelo servidor depois do login de administrador.
- `server.js` e `server/`: servidor Express, autenticação e banco SQLite.

## Publicação no Vercel

O `server.js` detecta o Vercel (variável `VERCEL`) e, nesse caso, exporta o app Express em vez de abrir uma porta e grava o SQLite no diretório temporário, porque o restante do disco da função é somente leitura.

Defina em *Project Settings → Environment Variables*:

- `ADMIN_PASSWORD`: senha do usuário `admin` (sem ela, cada nova instância gera uma senha aleatória que só aparece nos logs).
- `SESSION_SECRET`: texto aleatório longo para assinar os cookies de sessão.

Limitações no Vercel: o banco temporário é recriado a partir de `data/seed-cards.json` sempre que uma nova instância sobe, então cards e usuários criados pelo painel não são permanentes, e as sessões ficam na memória de cada instância. Para um painel com dados permanentes, use um banco externo ou hospede o servidor em um serviço com disco persistente.

## Testes

```powershell
npm test
```
