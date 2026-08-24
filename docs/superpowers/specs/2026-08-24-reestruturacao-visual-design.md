# Reestruturação visual da Companhia Vermelha

## Objetivo

Reorganizar o site atual, hoje concentrado em um único arquivo HTML, em uma estrutura simples e sustentável. A reformulação deve incorporar a nova logo, tornar os destinos mais visuais com fotografias reais e manter o conteúdo, a acessibilidade e as interações existentes.

## Escopo

- Preservar todas as seções, textos, formulários e comportamentos atuais.
- Separar marcação, estilos, scripts e imagens.
- Usar a imagem enviada como logo principal no cabeçalho e no rodapé.
- Substituir as ilustrações abstratas dos cards de Cuba, China e Vietnã por fotografias reais.
- Ajustar o cabeçalho para acomodar a logo com boa legibilidade em desktop e celular.
- Manter a solução como site estático, sem introduzir framework ou processo de build.

## Estrutura de arquivos

O projeto final usará a seguinte organização:

```text
companhia-vermelha/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── assets/
    └── images/
        ├── logo-companhia-vermelha.png
        ├── cuba.jpg
        ├── china.jpg
        └── vietna.jpg
```

O arquivo original permanecerá intacto como referência. A versão reorganizada será produzida na pasta de trabalho e poderá ser copiada para a pasta de publicação depois da validação.

## Identidade e cabeçalho

A logo fornecida possui 1408 × 768 pixels, resolução suficiente para o tamanho de exibição no site. Ela será preservada em PNG para evitar uma vetorização imprecisa dos contornos, do texto e da textura de papel.

O cabeçalho terá fundo branco com leve transparência quando fixo, altura maior e uma área de marca dedicada à esquerda. A logo será exibida com `object-fit: contain`, sem cortes e com dimensões responsivas. A navegação desktop terá espaçamento mais compacto para impedir colisão com a marca. Em telas intermediárias e pequenas, a navegação recolhida será acionada por botão e abrirá abaixo do cabeçalho.

O rodapé repetirá a logo sobre uma superfície clara própria, garantindo contraste com o fundo escuro atual.

## Fotografias dos destinos

Cada card de destino usará uma fotografia panorâmica real, representativa e inequivocamente associada ao país:

- Cuba: arquitetura e atmosfera urbana de Havana.
- China: paisagem arquitetônica ou histórica reconhecível.
- Vietnã: paisagem natural ou urbana culturalmente reconhecível.

As imagens serão obtidas de fontes com licença clara para reutilização, baixadas para o projeto e registradas em comentário próximo ao uso ou em arquivo de créditos. Serão normalizadas para uma proporção ampla adequada aos cards, comprimidas para web e exibidas com `object-fit: cover`. Uma sobreposição em degradê garantirá consistência visual e legibilidade dos rótulos.

## Comportamento e acessibilidade

As funcionalidades existentes continuarão em JavaScript sem dependência de framework: menu móvel, animações de entrada, seleção de destinos, comparador, filtros, mapa, carrossel, FAQ e validação de formulários.

As fotografias terão textos alternativos objetivos. Estados de foco, navegação por teclado, preferência por movimento reduzido e atributos ARIA existentes serão preservados. O deslocamento de âncoras será recalibrado para a nova altura do cabeçalho.

## Compatibilidade e tratamento de falhas

O site continuará abrindo diretamente pelo `index.html`. Os caminhos dos recursos serão relativos e funcionarão tanto localmente quanto em hospedagem estática. Caso uma imagem não carregue, o card manterá cor de fundo e texto legível.

## Verificação

A validação incluirá:

- conferência dos caminhos locais de CSS, JavaScript e imagens;
- inspeção visual em viewport desktop e celular;
- verificação da logo sem cortes ou deformação;
- verificação das três fotografias e seus enquadramentos;
- teste do menu desktop e móvel;
- teste de filtros, mapa, carrossel, FAQ e formulários;
- verificação de erros no console do navegador;
- comparação do conteúdo com o arquivo original para detectar perdas acidentais.

## Critérios de conclusão

O trabalho estará concluído quando o site reorganizado abrir sem erros, todo o conteúdo e todas as interações originais permanecerem disponíveis, a logo estiver claramente visível em desktop e celular e os três cards de destino exibirem fotografias locais reais com enquadramento consistente.
