# Reestruturação Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Transformar o HTML monolítico em um site estático organizado, com a nova logo e fotografias reais nos banners de Cuba, China e Vietnã.

**Architecture:** O HTML manterá a marcação e a configuração do Tailwind, enquanto estilos autorais e comportamento serão extraídos para arquivos dedicados. Imagens locais ficarão em `assets/images`, com caminhos relativos e sem processo de build.

**Tech Stack:** HTML5, CSS3, JavaScript, Tailwind CSS via CDN.

**Spec:** `docs/superpowers/specs/2026-08-24-reestruturacao-visual-design.md`

## Global Constraints

- Preservar todas as seções, textos, formulários e comportamentos atuais.
- Manter o site estático, sem framework adicional e sem processo de build.
- Usar fotografias reais locais com licença de reutilização clara.
- Preservar foco visível, navegação por teclado, movimento reduzido e atributos ARIA.
- Manter o arquivo original da área de trabalho intacto.

---

### Task 1: Estrutura estática separada

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `C:/Users/Gustavo/Desktop/Site Rodrigo/companhia-vermelha.html`.
- Produces: `index.html` referenciando `css/styles.css` e `js/main.js` por caminhos relativos.

- [x] **Step 1: Registrar a verificação estrutural que inicialmente falha**

```powershell
$required = @('index.html','css/styles.css','js/main.js')
$required | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Arquivo ausente: $_" } }
```

- [x] **Step 2: Executar a verificação e confirmar falha por arquivos ausentes**

Run: o comando PowerShell acima na raiz do projeto.
Expected: FAIL indicando `index.html` ausente.

- [x] **Step 3: Copiar a marcação e extrair CSS e JavaScript**

Criar `index.html` a partir do original, mover os dois blocos de CSS autoral para `css/styles.css`, mover o script final de comportamento para `js/main.js` e inserir:

```html
<link rel="stylesheet" href="css/styles.css">
<script src="js/main.js" defer></script>
```

- [x] **Step 4: Executar a verificação estrutural**

Run: o comando PowerShell do Step 1.
Expected: PASS sem saída de erro.

- [x] **Step 5: Confirmar preservação das seções**

```powershell
$old = Select-String -Path 'C:/Users/Gustavo/Desktop/Site Rodrigo/companhia-vermelha.html' -Pattern '<section id=' -AllMatches
$new = Select-String -Path 'index.html' -Pattern '<section id=' -AllMatches
if ($old.Matches.Count -ne $new.Matches.Count) { throw 'Quantidade de seções divergente' }
```

Expected: PASS.

### Task 2: Logo e fotografias dos destinos

**Files:**
- Create: `assets/images/logo-companhia-vermelha.png`
- Create: `assets/images/cuba.jpg`
- Create: `assets/images/china.jpg`
- Create: `assets/images/vietna.jpg`
- Create: `assets/images/CREDITS.md`
- Modify: `index.html`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: a logo fornecida e fotografias reais com licença documentada.
- Produces: classes `.brand-logo`, `.destination-photo` e `.destination-overlay`, e quatro imagens locais.

- [x] **Step 1: Registrar a verificação de assets que inicialmente falha**

```powershell
$assets = @('assets/images/logo-companhia-vermelha.png','assets/images/cuba.jpg','assets/images/china.jpg','assets/images/vietna.jpg')
$assets | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Asset ausente: $_" } }
```

- [x] **Step 2: Executar a verificação e confirmar falha**

Expected: FAIL indicando a logo ausente.

- [x] **Step 3: Adicionar e documentar os assets**

Copiar a logo enviada sem recompressão. Baixar uma fotografia de Havana, uma da China e uma do Vietnã, armazená-las localmente e registrar autor, página-fonte e licença em `assets/images/CREDITS.md`.

- [x] **Step 4: Integrar a marca e os banners**

Substituir a marca textual do cabeçalho e rodapé pela logo. Substituir os SVGs abstratos dos três cards por `<img>` com textos alternativos específicos, manter fallback de fundo e adicionar enquadramento responsivo com `object-fit: cover`.

- [x] **Step 5: Ajustar o cabeçalho responsivo**

Definir dimensões responsivas da logo, aumentar a altura do cabeçalho, compactar os espaçamentos de navegação e recalibrar `scroll-margin-top` e espaçamento do hero.

- [x] **Step 6: Executar a verificação de assets e referências**

```powershell
$html = Get-Content -Raw 'index.html'
@('logo-companhia-vermelha.png','cuba.jpg','china.jpg','vietna.jpg') | ForEach-Object { if ($html -notmatch [regex]::Escape($_)) { throw "Referência ausente: $_" } }
```

Expected: PASS.

### Task 3: Verificação funcional e visual

**Files:**
- Modify: `index.html`, `css/styles.css` ou `js/main.js` apenas se a verificação revelar defeitos.

**Interfaces:**
- Consumes: o site reorganizado completo.
- Produces: site validado em desktop e celular, sem erros de recursos ou regressões nas interações.

- [x] **Step 1: Validar sintaxe JavaScript**

Run: `node --check js/main.js`
Expected: exit code 0.

- [x] **Step 2: Iniciar servidor estático local**

Run: `python -m http.server 4173`
Expected: servidor ouvindo em `http://127.0.0.1:4173`.

- [x] **Step 3: Verificar visualmente desktop e celular**

Abrir o site em 1440 × 900 e 390 × 844. Confirmar logo sem corte, fotos bem enquadradas, menu sem colisões e ausência de rolagem horizontal.

- [x] **Step 4: Verificar interações principais**

Testar menu móvel, filtros do blog, seleção do mapa, carrossel, FAQ e validação dos dois formulários. Confirmar console sem erros.

- [x] **Step 5: Executar auditoria final de recursos**

```powershell
$refs = Select-String -Path 'index.html' -Pattern '(?:src|href)="((?:assets|css|js)/[^"]+)"' -AllMatches
$refs.Matches.Groups | Where-Object Name -eq 1 | ForEach-Object { if (-not (Test-Path -LiteralPath $_.Value)) { throw "Recurso quebrado: $($_.Value)" } }
```

Expected: PASS.

- [x] **Step 6: Commit da implementação**

```powershell
git add index.html css js assets docs/superpowers/plans/2026-08-24-reestruturacao-visual.md
git commit -m "feat: reorganizar site e adicionar identidade visual"
```
