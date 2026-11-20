(function () {
  'use strict';

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeImagePath(value) {
    return typeof value === 'string' && /^assets\/images\/[a-zA-Z0-9_.-]+$/.test(value) ? value : '';
  }

  function renderDestinations(cards) {
    var container = document.querySelector('.country-banners');
    if (!container) return;
    container.replaceChildren();
    if (!cards.length) {
      container.appendChild(element('p', 'text-inksoft text-sm', 'Nenhum destino cadastrado ainda.'));
      return;
    }
    cards.forEach(function (card, index) {
      var article = element('article', 'dest-card country-banner reveal in-view group');
      if (index) article.style.transitionDelay = (Math.min(index, 4) * 0.08) + 's';
      var imagePath = safeImagePath(card.image);
      if (imagePath) {
        var image = element('img', 'destination-photo');
        image.src = '/' + imagePath;
        image.alt = card.title + ' — ' + card.summary;
        image.loading = 'lazy';
        article.appendChild(image);
      }
      article.appendChild(element('div', 'country-banner-overlay'));
      var content = element('div', 'country-banner-content');
      content.appendChild(element('span', 'country-banner-label', card.details.split(/[.!?]/)[0] || card.category));
      content.appendChild(element('h3', 'font-display font-800 text-3xl md:text-4xl', card.title));
      content.appendChild(element('p', '', card.summary));
      var tags = element('div', 'country-banner-tags');
      tags.setAttribute('aria-label', 'Destaques de ' + card.title);
      (Array.isArray(card.tags) ? card.tags : []).forEach(function (tag) {
        tags.appendChild(element('span', '', tag));
      });
      content.appendChild(tags);
      var link = element('a', 'dest-cta', 'Conhecer ' + card.title + ' ');
      link.href = 'contato.html?destino=' + encodeURIComponent(card.title) + '#planejar';
      link.setAttribute('data-destino', card.title);
      var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('class', 'w-4 h-4');
      arrow.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#ic-arrow-right');
      arrow.appendChild(use);
      link.appendChild(arrow);
      content.appendChild(link);
      article.appendChild(content);
      container.appendChild(article);
    });
  }

  function renderArticle(card) {
    var article = element('article', 'blog-card reveal in-view rounded-[18px] border border-line overflow-hidden bg-white');
    var normalizedTags = (Array.isArray(card.tags) ? card.tags : [])
      .map(function (tag) { return String(tag).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); })
      .join(' ');
    article.setAttribute('data-tags', normalizedTags);
    var media = element('div', 'blog-card-media h-36');
    var imagePath = safeImagePath(card.image);
    if (imagePath) {
      var image = element('img', 'blog-card-image');
      image.src = '/' + imagePath;
      image.alt = card.category + ': ' + card.title;
      image.loading = 'lazy';
      image.width = 1200;
      image.height = 800;
      media.appendChild(image);
    } else {
      media.style.background = 'linear-gradient(135deg,#7A1029,#B4933A)';
    }
    article.appendChild(media);
    var content = element('div', 'p-6');
    var categoryClass = card.category === 'China' ? 'text-gold-deep' : card.category === 'Vietnã' ? 'text-ink' : 'text-red';
    content.appendChild(element('p', 'blog-card-category text-xs font-semibold ' + categoryClass + ' uppercase tracking-wide', card.category));
    content.appendChild(element('h3', 'font-display font-700 text-[17px] mt-2 leading-snug', card.title));
    content.appendChild(element('p', 'blog-card-summary mt-2 text-[13.5px] text-inksoft leading-relaxed', card.summary));
    article.appendChild(content);
    var trigger = element('button', 'blog-card-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Ler artigo: ' + card.title);
    trigger.appendChild(element('span', 'sr-only', 'Ler artigo'));
    article.appendChild(trigger);
    return article;
  }

  function openArticle(card, trigger) {
    var dialog = document.getElementById('article-modal');
    if (!dialog) return;
    var tags = Array.isArray(card.tags) ? card.tags : [];
    var details = String(card.details || '').split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
    document.getElementById('article-modal-title').textContent = card.title;
    document.getElementById('article-modal-category').textContent = card.category || 'Caderno Vermelho';
    document.getElementById('article-modal-summary').textContent = card.summary;
    var list = document.getElementById('article-modal-points');
    list.replaceChildren();
    (details.length ? details : tags).forEach(function (detail) {
      var item = element('li', '', detail);
      list.appendChild(item);
    });
    var modalMedia = document.getElementById('article-modal-media');
    var modalImage = document.getElementById('article-modal-image');
    var imagePath = safeImagePath(card.image);
    if (imagePath) {
      modalImage.src = '/' + imagePath;
      modalImage.alt = card.category + ': ' + card.title;
      modalImage.hidden = false;
      modalMedia.classList.remove('blog-modal-media-placeholder');
    } else {
      modalImage.removeAttribute('src');
      modalImage.alt = '';
      modalImage.hidden = true;
      modalMedia.classList.add('blog-modal-media-placeholder');
    }
    dialog.showModal();
  }

  function renderArticles(cards) {
    var grid = document.getElementById('blog-grid');
    if (!grid) return;
    var empty = document.getElementById('blog-empty');
    if (!cards.length) {
      grid.replaceChildren();
      empty.textContent = 'Nenhum artigo cadastrado ainda.';
      empty.classList.remove('hidden');
      return;
    }
    grid.replaceChildren.apply(grid, cards.map(renderArticle));
    empty.classList.add('hidden');
    document.querySelectorAll('#blog-filters .tag-pill').forEach(function (button) {
      button.addEventListener('click', function () {
        var filter = button.getAttribute('data-filter');
        var visible = 0;
        grid.querySelectorAll('.blog-card').forEach(function (card) {
          var show = filter === 'todos' || (card.getAttribute('data-tags') || '').split(/\s+/).includes(filter);
          card.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        empty.classList.toggle('hidden', visible !== 0);
        if (visible === 0) empty.textContent = 'Nenhum artigo encontrado para esse filtro.';
      });
    });

    grid.addEventListener('click', function (event) {
      var trigger = event.target.closest('.blog-card-trigger');
      if (!trigger) return;
      var index = Array.prototype.indexOf.call(grid.querySelectorAll('.blog-card-trigger'), trigger);
      if (index >= 0) openArticle(cards[index], trigger);
    });
  }

  function showLoadError(selector, message) {
    var container = document.querySelector(selector);
    if (!container) return;
    var notice = element('p', 'mt-4 text-inksoft text-sm', message);
    notice.setAttribute('role', 'status');
    container.appendChild(notice);
  }

  function loadCards(type, render, selector) {
    fetch('/api/cards?type=' + encodeURIComponent(type))
      .then(function (response) {
        if (!response.ok) throw new Error('Falha ao carregar conteúdo.');
        return response.json();
      })
      .then(function (cards) { render(Array.isArray(cards) ? cards : []); })
      .catch(function () { showLoadError(selector, 'Não foi possível atualizar os cards. Exibindo o conteúdo disponível.'); });
  }

  if (document.querySelector('.country-banners')) loadCards('destination', renderDestinations, '.country-banners');
  if (document.getElementById('blog-grid')) loadCards('article', renderArticles, '#blog-grid');
})();
