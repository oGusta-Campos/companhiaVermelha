const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.className = '';
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.listeners = {};
  }

  get classList() {
    const element = this;
    return {
      contains(name) { return element.className.split(/\s+/).includes(name); },
      add(name) {
        if (!this.contains(name)) element.className = `${element.className} ${name}`.trim();
      },
      remove(name) {
        element.className = element.className.split(/\s+/).filter((entry) => entry !== name).join(' ');
      },
      toggle(name, force) {
        const shouldAdd = force === undefined ? !this.contains(name) : force;
        if (shouldAdd) this.add(name);
        else this.remove(name);
        return shouldAdd;
      }
    };
  }

  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  showModal() { this.open = true; }
  querySelectorAll(selector) {
    const results = [];
    const visit = (node) => {
      node.children.forEach((child) => {
        if (selector === '.blog-card-trigger' && child.classList.contains('blog-card-trigger')) results.push(child);
        visit(child);
      });
    };
    visit(this);
    return results;
  }
}

async function renderPublicCards(data) {
  const publicCardsSource = fs.readFileSync(path.join(__dirname, '../js/public-cards.js'), 'utf8');
  const destinations = new FakeElement('div');
  const articles = new FakeElement('div');
  const empty = new FakeElement('p');
  destinations.appendChild(new FakeElement('article'));
  articles.appendChild(new FakeElement('article'));
  const modal = new FakeElement('dialog');
  const modalMedia = new FakeElement('div');
  const modalImage = new FakeElement('img');
  const elementsById = {
    'blog-grid': articles,
    'blog-empty': empty,
    'article-modal': modal,
    'article-modal-title': new FakeElement('h2'),
    'article-modal-category': new FakeElement('p'),
    'article-modal-summary': new FakeElement('p'),
    'article-modal-points': new FakeElement('ul'),
    'article-modal-media': modalMedia,
    'article-modal-image': modalImage
  };
  const document = {
    createElement(tagName) { return new FakeElement(tagName); },
    createElementNS(_namespace, tagName) { return new FakeElement(tagName); },
    querySelector(selector) { return selector === '.country-banners' ? destinations : null; },
    querySelectorAll() { return []; },
    getElementById(id) { return elementsById[id] || null; }
  };
  const context = {
    document,
    fetch(url) {
      const cards = url.includes('destination') ? data.destinations : data.articles;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(cards) });
    }
  };

  vm.runInNewContext(publicCardsSource, context);
  await new Promise((resolve) => setImmediate(resolve));
  return { destinations, articles, empty, elementsById, modal, modalMedia, modalImage };
}

test('cards criados depois do DOMContentLoaded são renderizados visíveis', async () => {
  const destinationCard = {
    type: 'destination', title: 'Cuba', category: 'Cuba', summary: 'Resumo',
    details: 'Capital: Havana.', tags: ['Cultura'], image: 'assets/images/cuba.jpg'
  };
  const articleCard = {
    type: 'article', title: 'Artigo de teste', category: 'Cuba', summary: 'Resumo',
    details: 'Detalhes', tags: ['Cuba'], image: 'assets/images/cuba.jpg'
  };
  const { destinations, articles } = await renderPublicCards({ destinations: [destinationCard], articles: [articleCard] });

  assert.equal(destinations.children.length, 1);
  assert.equal(articles.children.length, 1);
  assert.ok(destinations.children[0].classList.contains('in-view'), 'banner deve estar visível sem depender do observador inicial');
  assert.ok(articles.children[0].classList.contains('in-view'), 'artigo deve estar visível sem depender do observador inicial');
});

test('respostas vazias removem o conteúdo inicial e exibem estados vazios', async () => {
  const { destinations, articles, empty } = await renderPublicCards({ destinations: [], articles: [] });

  assert.equal(destinations.children.length, 1);
  assert.match(destinations.children[0].textContent, /nenhum destino/i);
  assert.equal(articles.children.length, 0);
  assert.equal(empty.classList.contains('hidden'), false);
  assert.match(empty.textContent, /nenhum artigo/i);
});

test('texto malicioso de artigo permanece literal no card e no modal', async () => {
  const maliciousTitle = '<script>alert(1)</script>';
  const maliciousDetails = '<img src=x onerror=alert(1)>';
  const articleCard = {
    type: 'article', title: maliciousTitle, category: 'Cuba', summary: 'Resumo',
    details: maliciousDetails, tags: ['Cuba'], image: 'assets/images/cuba.jpg'
  };
  const { articles, elementsById, modal } = await renderPublicCards({ destinations: [], articles: [articleCard] });
  const article = articles.children[0];
  const trigger = articles.querySelectorAll('.blog-card-trigger')[0];
  articles.listeners.click({ target: { closest: () => trigger } });

  assert.equal(article.children[1].children[1].textContent, maliciousTitle);
  assert.equal(elementsById['article-modal-title'].textContent, maliciousTitle);
  assert.equal(elementsById['article-modal-points'].children[0].textContent, maliciousDetails);
  assert.equal(modal.open, true);
  assert.equal(articles.querySelectorAll('script').length, 0);
});
